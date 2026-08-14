-- ============================================================
-- Migration: Debt & Collection Management Module (v2)
-- Date: 2026-08-14
-- ============================================================
-- The frontend is DISPLAY-ONLY. Every business decision lives here:
--   classification, aging, reminder window, promise lifecycle,
--   analytics aggregation, reminder logging.
--
-- Design notes:
--   * Tenant isolation via company_id + RLS (get_user_company_id()).
--   * Roles actually present in the system: admin/manager/accountant/sales/viewer.
--   * All RPCs are SECURITY DEFINER with SET search_path = '' and fully
--     qualified public.* references (hardened pattern).
--   * debt_message_log doubles as the "last reminder" source of truth
--     (no separate denormalized column needed).
--   * get_party_statement() is intentionally reused (parties feature).
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 0. Cleanup legacy debt module objects (v1)
--    Legacy tables are empty (verified) — drop and recreate with
--    the v2 schema so CHECK constraints and columns match exactly.
--    KEPT (used elsewhere): get_party_statement(), report_debts(),
--    report_debt_aging(), update_updated_at_column().
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.get_debt_followup_dashboard(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.get_debt_today_tasks(uuid);
DROP FUNCTION IF EXISTS public.get_debt_analytics_summary(uuid);
DROP FUNCTION IF EXISTS public.get_party_all_balances(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_party_balance_by_currency(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.update_party_credit_limit(uuid, numeric);

DROP TABLE IF EXISTS public.debt_message_log;
DROP TABLE IF EXISTS public.debt_payment_promises;
DROP TABLE IF EXISTS public.party_opening_balances;
DROP TABLE IF EXISTS public.debt_message_templates;
DROP TABLE IF EXISTS public.debt_followup_config;

DROP VIEW IF EXISTS public.party_balances_by_currency CASCADE;


-- ─────────────────────────────────────────────────────────────
-- 1. Helper: can current user manage debt records?
--    (admin, manager, accountant can manage; admin+manager delete)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.user_can_manage_debts()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT public.get_user_role() IN ('admin', 'manager', 'accountant');
$$;

COMMENT ON FUNCTION public.user_can_manage_debts() IS
'RLS helper: true when the current user can manage debt records (promises, opening balances, templates).';

-- ─────────────────────────────────────────────────────────────
-- 2. Multi-currency party balances VIEW (from posted journal entries)
-- ─────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.party_balances_by_currency CASCADE;

CREATE OR REPLACE VIEW public.party_balances_by_currency AS
SELECT
    jel.party_id,
    jel.company_id,
    jel.currency_code,
    SUM(COALESCE(jel.debit_amount, 0)) - SUM(COALESCE(jel.credit_amount, 0)) AS balance,
    COUNT(DISTINCT jel.journal_entry_id) AS transaction_count,
    MAX(je.entry_date) AS last_activity_date
FROM public.journal_entry_lines jel
JOIN public.journal_entries je
    ON je.id = jel.journal_entry_id
    AND je.deleted_at IS NULL
    AND je.status = 'posted'
WHERE jel.deleted_at IS NULL
  AND jel.party_id IS NOT NULL
  AND jel.currency_code IS NOT NULL
GROUP BY jel.party_id, jel.company_id, jel.currency_code;

COMMENT ON VIEW public.party_balances_by_currency IS
'Multi-currency party balances from posted journal entries. Consumed only by SECURITY DEFINER RPCs.';

-- ─────────────────────────────────────────────────────────────
-- 3. Table: follow-up engine configuration (1 row per company)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.debt_followup_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE RESTRICT,
    due_soon_days INT NOT NULL DEFAULT 7 CHECK (due_soon_days BETWEEN 1 AND 90),
    critical_days INT NOT NULL DEFAULT 30 CHECK (critical_days BETWEEN 1 AND 365),
    reminder_window_days INT NOT NULL DEFAULT 3 CHECK (reminder_window_days BETWEEN 1 AND 90),
    whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reminder_signature TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.debt_followup_config IS
'Per-company follow-up engine configuration. due_soon_days/critical_days drive classification; reminder_window_days drives needs_reminder/reminded.';

-- ─────────────────────────────────────────────────────────────
-- 4. Table: payment promises
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.debt_payment_promises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    amount DECIMAL(18,4) NOT NULL CHECK (amount > 0),
    currency_code VARCHAR(3) NOT NULL DEFAULT 'SAR',
    promise_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'broken', 'cancelled')),
    reference_type VARCHAR(20)
        CHECK (reference_type IN ('invoice', 'opening_balance', 'payment', 'manual')),
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.debt_payment_promises IS
'Customer payment promises. pending->completed/broken/cancelled. broken is set automatically by break_overdue_promises(). completed links to a payment via reference_type=''payment''.';

CREATE INDEX IF NOT EXISTS idx_promises_party ON public.debt_payment_promises(party_id);
CREATE INDEX IF NOT EXISTS idx_promises_company ON public.debt_payment_promises(company_id);
CREATE INDEX IF NOT EXISTS idx_promises_status ON public.debt_payment_promises(status);
CREATE INDEX IF NOT EXISTS idx_promises_date ON public.debt_payment_promises(promise_date);

-- ─────────────────────────────────────────────────────────────
-- 5. Table: message templates ({{customer_name}}, {{amount}}, ...)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.debt_message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    name VARCHAR(100) NOT NULL,
    body TEXT NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp'
        CHECK (channel IN ('whatsapp', 'sms', 'email', 'in_app')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.debt_message_templates IS
'Templates for debt reminders. Supported placeholders: {{customer_name}} {{amount}} {{currency}} {{due_date}} {{days_overdue}} {{invoice_number}} {{company_name}}.';

CREATE INDEX IF NOT EXISTS idx_msg_templates_company ON public.debt_message_templates(company_id);

-- ─────────────────────────────────────────────────────────────
-- 6. Table: message log / outbox (source of truth for "last reminder")
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.debt_message_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp'
        CHECK (channel IN ('whatsapp', 'sms', 'email', 'in_app')),
    template_id UUID REFERENCES public.debt_message_templates(id) ON DELETE SET NULL,
    message_text TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'sent'
        CHECK (status IN ('sent', 'failed', 'cancelled')),
    recipient VARCHAR(200),
    related_entity_type VARCHAR(30),
    related_entity_id UUID,
    error_info TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ
);

COMMENT ON TABLE public.debt_message_log IS
'Outbox and audit trail for debt communications. status=''sent'' rows define the reminder window for the follow-up classification.';

CREATE INDEX IF NOT EXISTS idx_msg_log_party ON public.debt_message_log(party_id);
CREATE INDEX IF NOT EXISTS idx_msg_log_company ON public.debt_message_log(company_id);
CREATE INDEX IF NOT EXISTS idx_msg_log_status ON public.debt_message_log(status);
CREATE INDEX IF NOT EXISTS idx_msg_log_created ON public.debt_message_log(created_at);

-- ─────────────────────────────────────────────────────────────
-- 7. Table: opening balances (legacy debts before the system)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.party_opening_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    party_id UUID NOT NULL REFERENCES public.parties(id) ON DELETE RESTRICT,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'SAR',
    amount DECIMAL(18,4) NOT NULL CHECK (amount >= 0),
    direction VARCHAR(10) NOT NULL DEFAULT 'debit'
        CHECK (direction IN ('debit', 'credit')),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number VARCHAR(50),
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_party_opening_balance UNIQUE (company_id, party_id, currency_code)
);

COMMENT ON TABLE public.party_opening_balances IS
'Opening balances per party per currency. direction=''debit'' = customer owes us, ''credit'' = we owe them.';

CREATE INDEX IF NOT EXISTS idx_opening_balances_party ON public.party_opening_balances(party_id);
CREATE INDEX IF NOT EXISTS idx_opening_balances_company ON public.party_opening_balances(company_id);

-- ─────────────────────────────────────────────────────────────
-- 8. updated_at triggers (shared update_updated_at_column())
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_update_followup_config ON public.debt_followup_config;
CREATE TRIGGER trg_update_followup_config
    BEFORE UPDATE ON public.debt_followup_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_promises ON public.debt_payment_promises;
CREATE TRIGGER trg_update_promises
    BEFORE UPDATE ON public.debt_payment_promises
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_msg_templates ON public.debt_message_templates;
CREATE TRIGGER trg_update_msg_templates
    BEFORE UPDATE ON public.debt_message_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_update_opening_balances ON public.party_opening_balances;
CREATE TRIGGER trg_update_opening_balances
    BEFORE UPDATE ON public.party_opening_balances
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 9. RLS policies (tenant isolation + role gates)
--    SELECT: any authenticated user of the company
--    INSERT/UPDATE: user_can_manage_debts() (admin/manager/accountant)
--    DELETE: admin/manager only
-- ─────────────────────────────────────────────────────────────

-- ── debt_payment_promises ────────────────────────────────────
ALTER TABLE public.debt_payment_promises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_select_promises" ON public.debt_payment_promises;
CREATE POLICY "debt_select_promises" ON public.debt_payment_promises
    FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "debt_insert_promises" ON public.debt_payment_promises;
CREATE POLICY "debt_insert_promises" ON public.debt_payment_promises
    FOR INSERT TO authenticated WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_can_manage_debts()
    );

DROP POLICY IF EXISTS "debt_update_promises" ON public.debt_payment_promises;
CREATE POLICY "debt_update_promises" ON public.debt_payment_promises
    FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id())
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_can_manage_debts()
    );

DROP POLICY IF EXISTS "debt_delete_promises" ON public.debt_payment_promises;
CREATE POLICY "debt_delete_promises" ON public.debt_payment_promises
    FOR DELETE TO authenticated USING (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- ── debt_followup_config ─────────────────────────────────────
ALTER TABLE public.debt_followup_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_select_followup" ON public.debt_followup_config;
CREATE POLICY "debt_select_followup" ON public.debt_followup_config
    FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "debt_manage_followup" ON public.debt_followup_config;
CREATE POLICY "debt_manage_followup" ON public.debt_followup_config
    FOR ALL TO authenticated USING (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    )
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- ── debt_message_templates ───────────────────────────────────
ALTER TABLE public.debt_message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_select_templates" ON public.debt_message_templates;
CREATE POLICY "debt_select_templates" ON public.debt_message_templates
    FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "debt_manage_templates" ON public.debt_message_templates;
CREATE POLICY "debt_manage_templates" ON public.debt_message_templates
    FOR ALL TO authenticated USING (
        company_id = public.get_user_company_id()
        AND public.user_can_manage_debts()
    )
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_can_manage_debts()
    );


-- ── debt_message_log ─────────────────────────────────────────
ALTER TABLE public.debt_message_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_select_msg_log" ON public.debt_message_log;
CREATE POLICY "debt_select_msg_log" ON public.debt_message_log
    FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "debt_insert_msg_log" ON public.debt_message_log;
CREATE POLICY "debt_insert_msg_log" ON public.debt_message_log
    FOR INSERT TO authenticated WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "debt_update_msg_log" ON public.debt_message_log;
CREATE POLICY "debt_update_msg_log" ON public.debt_message_log
    FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id())
    WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "debt_delete_msg_log" ON public.debt_message_log;
CREATE POLICY "debt_delete_msg_log" ON public.debt_message_log
    FOR DELETE TO authenticated USING (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- ── party_opening_balances ───────────────────────────────────
ALTER TABLE public.party_opening_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_select_opening_balances" ON public.party_opening_balances;
CREATE POLICY "debt_select_opening_balances" ON public.party_opening_balances
    FOR SELECT TO authenticated USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "debt_insert_opening_balances" ON public.party_opening_balances;
CREATE POLICY "debt_insert_opening_balances" ON public.party_opening_balances
    FOR INSERT TO authenticated WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_can_manage_debts()
    );

DROP POLICY IF EXISTS "debt_update_opening_balances" ON public.party_opening_balances;
CREATE POLICY "debt_update_opening_balances" ON public.party_opening_balances
    FOR UPDATE TO authenticated USING (company_id = public.get_user_company_id())
    WITH CHECK (
        company_id = public.get_user_company_id()
        AND public.user_can_manage_debts()
    );

DROP POLICY IF EXISTS "debt_delete_opening_balances" ON public.party_opening_balances;
CREATE POLICY "debt_delete_opening_balances" ON public.party_opening_balances
    FOR DELETE TO authenticated USING (
        company_id = public.get_user_company_id()
        AND public.user_is_admin_or_manager()
    );

-- ─────────────────────────────────────────────────────────────
-- 10. Role permissions (server-side permission model)
--     frontend usePermission('debts:...') depends on these rows
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.role_permissions (role, permission) VALUES
    ('admin',      'debts:read'),   ('admin',      'debts:manage'), ('admin',      'debts:remind'),
    ('manager',    'debts:read'),   ('manager',    'debts:manage'), ('manager',    'debts:remind'),
    ('accountant', 'debts:read'),   ('accountant', 'debts:manage'),
    ('sales',      'debts:read'),   ('sales',      'debts:remind'),
    ('viewer',     'debts:read')
ON CONFLICT (role, permission) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 11. RPC: get_party_all_balances — multi-currency party balances
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_party_all_balances(
    p_company_id UUID,
    p_party_id UUID
)
RETURNS TABLE(
    party_id UUID,
    currency_code VARCHAR,
    balance NUMERIC,
    transaction_count BIGINT,
    last_activity_date DATE
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT pb.party_id, pb.currency_code, pb.balance, pb.transaction_count, pb.last_activity_date
    FROM public.party_balances_by_currency pb
    WHERE pb.company_id = p_company_id AND pb.party_id = p_party_id
    ORDER BY pb.currency_code;
END;
$$;

COMMENT ON FUNCTION public.get_party_all_balances(UUID, UUID) IS
'Returns per-currency balances for one party, computed from posted journal entries.';

-- ─────────────────────────────────────────────────────────────
-- 12. RPC: get_debt_followup_dashboard — THE HEART of the module
--     One row per (party, currency) with outstanding balance > 0.
--     classification + reminder status computed entirely here.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_debt_followup_dashboard(
    p_company_id UUID,
    p_due_soon_days INT DEFAULT 7,
    p_critical_days INT DEFAULT 30,
    p_reminder_window_days INT DEFAULT 3
)
RETURNS TABLE(
    party_id UUID,
    party_name TEXT,
    party_phone TEXT,
    category TEXT,
    credit_limit NUMERIC,
    currency_code TEXT,
    outstanding_balance NUMERIC,
    overdue_amount NUMERIC,
    oldest_due_date DATE,
    next_due_date DATE,
    days_overdue INT,
    classification TEXT,
    reminder_status TEXT,
    last_reminded_at TIMESTAMPTZ,
    last_contact_date TIMESTAMPTZ,
    has_broken_promise BOOLEAN,
    pending_promise_count BIGINT,
    pending_promise_amount NUMERIC,
    pending_promise_date DATE,
    invoice_count BIGINT,
    opening_balance NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    WITH invoice_debts AS (
        SELECT
            i.party_id,
            i.currency_code,
            SUM(i.total_amount - COALESCE(i.paid_amount, 0)) AS outstanding,
            SUM(CASE WHEN i.due_date < v_today
                THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS overdue_amount,
            MIN(i.due_date) FILTER (WHERE i.due_date < v_today) AS oldest_due_date,
            MIN(i.due_date) FILTER (WHERE i.due_date >= v_today) AS next_due_date,
            COUNT(*) AS invoice_count
        FROM public.invoices i
        WHERE i.company_id = p_company_id
          AND i.type = 'sale'
          AND i.status IN ('posted', 'partial')
          AND i.deleted_at IS NULL
          AND i.party_id IS NOT NULL
        GROUP BY i.party_id, i.currency_code
    ),
    opening_balances AS (
        SELECT
            ob.party_id,
            ob.currency_code,
            SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END) AS opening_amount
        FROM public.party_opening_balances ob
        WHERE ob.company_id = p_company_id
        GROUP BY ob.party_id, ob.currency_code
    ),
    combined AS (
        SELECT
            COALESCE(id.party_id, ob.party_id) AS party_id,
            COALESCE(id.currency_code, ob.currency_code) AS currency_code,
            COALESCE(id.outstanding, 0) + COALESCE(ob.opening_amount, 0) AS outstanding_balance,
            COALESCE(id.overdue_amount, 0) AS overdue_amount,
            id.oldest_due_date,
            id.next_due_date,
            COALESCE(id.invoice_count, 0) AS invoice_count,
            COALESCE(ob.opening_amount, 0) AS opening_balance
        FROM invoice_debts id
        FULL OUTER JOIN opening_balances ob
            ON ob.party_id = id.party_id AND ob.currency_code = id.currency_code
    ),
    promise_summary AS (
        SELECT
            pp.party_id,
            COUNT(*) FILTER (WHERE pp.status = 'pending') AS pending_promise_count,
            SUM(pp.amount) FILTER (WHERE pp.status = 'pending') AS pending_promise_amount,
            MIN(pp.promise_date) FILTER (WHERE pp.status = 'pending') AS pending_promise_date,
            BOOL_OR(pp.status = 'broken') AS has_broken_promise
        FROM public.debt_payment_promises pp
        WHERE pp.company_id = p_company_id
        GROUP BY pp.party_id
    ),
    last_reminders AS (
        SELECT DISTINCT ON (ml.party_id)
            ml.party_id, ml.created_at AS last_reminded_at
        FROM public.debt_message_log ml
        WHERE ml.company_id = p_company_id AND ml.status = 'sent'
        ORDER BY ml.party_id, ml.created_at DESC
    ),
    last_contacts AS (
        SELECT DISTINCT ON (ca.customer_id)
            ca.customer_id, ca.created_at AS last_contact_date
        FROM public.customer_activities ca
        WHERE ca.company_id = p_company_id
        ORDER BY ca.customer_id, ca.created_at DESC
    )


    SELECT
        c.party_id,
        p.name::TEXT AS party_name,
        p.phone::TEXT AS party_phone,
        COALESCE(pc.name, 'عام')::TEXT AS category,
        p.credit_limit,
        c.currency_code::TEXT AS currency_code,
        c.outstanding_balance,
        c.overdue_amount,
        c.oldest_due_date,
        c.next_due_date,
        CASE WHEN c.oldest_due_date IS NOT NULL
            THEN (v_today - c.oldest_due_date) ELSE 0 END AS days_overdue,
        CASE
            WHEN c.oldest_due_date IS NOT NULL
                 AND (v_today - c.oldest_due_date) >= p_critical_days THEN 'critical'
            WHEN c.oldest_due_date IS NOT NULL AND c.oldest_due_date < v_today THEN 'overdue'
            WHEN c.oldest_due_date = v_today THEN 'due_today'
            WHEN c.next_due_date IS NOT NULL
                 AND c.next_due_date <= v_today + p_due_soon_days THEN 'due_soon'
            ELSE 'current'
        END AS classification,
        CASE
            WHEN lr.last_reminded_at IS NOT NULL
                 AND lr.last_reminded_at >= NOW() - make_interval(days => p_reminder_window_days)
                 THEN 'reminded'
            ELSE 'needs_reminder'
        END AS reminder_status,
        lr.last_reminded_at,
        lc.last_contact_date,
        COALESCE(ps.has_broken_promise, false) AS has_broken_promise,
        COALESCE(ps.pending_promise_count, 0) AS pending_promise_count,
        COALESCE(ps.pending_promise_amount, 0) AS pending_promise_amount,
        ps.pending_promise_date,
        c.invoice_count,
        c.opening_balance
    FROM combined c
    JOIN public.parties p ON p.id = c.party_id AND p.deleted_at IS NULL
    LEFT JOIN public.party_categories pc ON pc.id = p.category_id
    LEFT JOIN promise_summary ps ON ps.party_id = c.party_id
    LEFT JOIN last_reminders lr ON lr.party_id = c.party_id
    LEFT JOIN last_contacts lc ON lc.customer_id = c.party_id
    WHERE c.outstanding_balance > 0
    ORDER BY c.overdue_amount DESC NULLS LAST, days_overdue DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.get_debt_followup_dashboard(UUID, INT, INT, INT) IS
'Follow-up engine: classifies each debtor (current/due_soon/due_today/overdue/critical) and reminder status (needs_reminder/reminded). Frontend renders only.';

-- ─────────────────────────────────────────────────────────────
-- 13. RPC: get_debt_today_tasks — today's action items
--     (due today invoices, promises due today, broken promises,
--      failed messages) sorted by urgency.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_debt_today_tasks(
    p_company_id UUID
)
RETURNS TABLE(
    task_type VARCHAR,
    party_id UUID,
    party_name TEXT,
    party_phone TEXT,
    currency_code TEXT,
    amount NUMERIC,
    reference_info TEXT,
    urgency VARCHAR
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    SELECT * FROM (
        SELECT 'due_today'::VARCHAR AS task_type,
            i.party_id, p.name::TEXT AS party_name, p.phone::TEXT AS party_phone,
            i.currency_code::TEXT AS currency_code,
            (i.total_amount - COALESCE(i.paid_amount, 0))::NUMERIC AS amount,
            COALESCE(i.invoice_number, i.id::TEXT)::TEXT AS reference_info,
            'high'::VARCHAR AS urgency
        FROM public.invoices i
        JOIN public.parties p ON p.id = i.party_id AND p.deleted_at IS NULL
        WHERE i.company_id = p_company_id
          AND i.type = 'sale' AND i.status IN ('posted', 'partial')
          AND i.due_date = v_today AND i.deleted_at IS NULL
          AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0

        UNION ALL
        SELECT 'promise_due'::VARCHAR,
            pp.party_id, p.name::TEXT, p.phone::TEXT,
            pp.currency_code::TEXT,
            pp.amount,
            ('وعد ' || to_char(pp.promise_date, 'YYYY-MM-DD'))::TEXT,
            'high'::VARCHAR
        FROM public.debt_payment_promises pp
        JOIN public.parties p ON p.id = pp.party_id AND p.deleted_at IS NULL
        WHERE pp.company_id = p_company_id AND pp.status = 'pending'
          AND pp.promise_date = v_today

        UNION ALL
        SELECT 'broken_promise'::VARCHAR,
            pp.party_id, p.name::TEXT, p.phone::TEXT,
            pp.currency_code::TEXT,
            pp.amount,
            ('وعد متجاوز ' || to_char(pp.promise_date, 'YYYY-MM-DD'))::TEXT,
            'critical'::VARCHAR
        FROM public.debt_payment_promises pp
        JOIN public.parties p ON p.id = pp.party_id AND p.deleted_at IS NULL
        WHERE pp.company_id = p_company_id AND pp.status = 'pending'
          AND pp.promise_date < v_today

        UNION ALL
        SELECT 'failed_message'::VARCHAR,
            dm.party_id, p.name::TEXT, p.phone::TEXT,
            NULL::TEXT AS currency_code,
            NULL::NUMERIC AS amount,
            COALESCE(dm.error_info, 'رسالة فاشلة')::TEXT AS reference_info,
            'medium'::VARCHAR
        FROM public.debt_message_log dm
        JOIN public.parties p ON p.id = dm.party_id AND p.deleted_at IS NULL
        WHERE dm.company_id = p_company_id AND dm.status = 'failed'
          AND dm.created_at::DATE = v_today
    ) sub
    ORDER BY CASE sub.urgency
        WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
        sub.amount DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION public.get_debt_today_tasks(UUID) IS
'Action items for today: invoices due, promises due, broken promises and failed messages, sorted by urgency.';


-- ─────────────────────────────────────────────────────────────
-- 14. RPC: get_debt_analytics_summary — dashboard stats as JSON
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_debt_analytics_summary(
    p_company_id UUID
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
DECLARE v_today DATE := CURRENT_DATE;
DECLARE v_result JSON;
BEGIN
    SELECT json_build_object(
        'total_receivables',
            COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partial') AND i.deleted_at IS NULL
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'overdue_receivables',
            COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partial') AND i.deleted_at IS NULL
                  AND i.due_date < v_today
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'due_today',
            COALESCE((SELECT SUM(i.total_amount - COALESCE(i.paid_amount, 0))
                FROM public.invoices i
                WHERE i.company_id = p_company_id AND i.type = 'sale'
                  AND i.status IN ('posted', 'partial') AND i.deleted_at IS NULL
                  AND i.due_date = v_today
                  AND (i.total_amount - COALESCE(i.paid_amount, 0)) > 0), 0)::NUMERIC,
        'opening_balances_total',
            COALESCE((SELECT SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END)
                FROM public.party_opening_balances ob
                WHERE ob.company_id = p_company_id), 0)::NUMERIC,
        'pending_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'pending'), 0),
        'pending_promises_amount',
            COALESCE((SELECT SUM(amount) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'pending'), 0)::NUMERIC,
        'broken_promises',
            COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'broken'), 0),
        'broken_promises_amount',
            COALESCE((SELECT SUM(amount) FROM public.debt_payment_promises
                WHERE company_id = p_company_id AND status = 'broken'), 0)::NUMERIC,
        'sent_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'sent'), 0),
        'failed_messages',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'failed'), 0),
        'failed_messages_24h',
            COALESCE((SELECT COUNT(*) FROM public.debt_message_log
                WHERE company_id = p_company_id AND status = 'failed'
                  AND created_at >= NOW() - INTERVAL '24 hours'), 0),
        'total_debtors',
            COALESCE((SELECT COUNT(*)::INT
                FROM public.get_debt_followup_dashboard(p_company_id)), 0),
        'needs_reminder',
            COALESCE((SELECT COUNT(*)::INT
                FROM public.get_debt_followup_dashboard(p_company_id)
                WHERE reminder_status = 'needs_reminder'), 0),
        'by_currency',
            (SELECT json_agg(json_build_object(
                'currency', x.currency_code,
                'balance', x.balance,
                'count', x.transaction_count))
             FROM public.party_balances_by_currency x
             WHERE x.company_id = p_company_id AND x.balance > 0)
    ) INTO v_result;
    RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_debt_analytics_summary(UUID) IS
'Dashboard statistics for the debts module as a single JSON document.';


-- ─────────────────────────────────────────────────────────────
-- 15. RPC: get_debt_party_overview — one-row summary for a party
--     (customer debt detail page)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_debt_party_overview(
    p_company_id UUID,
    p_party_id UUID
)
RETURNS TABLE(
    party_id UUID,
    party_name TEXT,
    party_phone TEXT,
    category TEXT,
    credit_limit NUMERIC,
    total_outstanding NUMERIC,
    overdue_amount NUMERIC,
    due_today_amount NUMERIC,
    invoice_count BIGINT,
    opening_balance NUMERIC,
    has_broken_promise BOOLEAN,
    pending_promise_count BIGINT,
    pending_promise_amount NUMERIC,
    last_reminded_at TIMESTAMPTZ,
    last_contact_date TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = ''
AS $$
DECLARE v_today DATE := CURRENT_DATE;
BEGIN
    RETURN QUERY
    SELECT
        p.id AS party_id,
        p.name::TEXT AS party_name,
        p.phone::TEXT AS party_phone,
        COALESCE(pc.name, 'عام')::TEXT AS category,
        p.credit_limit,
        COALESCE(SUM(CASE WHEN i.id IS NOT NULL
            THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0)::NUMERIC
            + COALESCE((SELECT SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END)
                FROM public.party_opening_balances ob
                WHERE ob.company_id = p_company_id AND ob.party_id = p_party_id), 0)::NUMERIC
            AS total_outstanding,
        COALESCE(SUM(CASE WHEN i.due_date < v_today
            THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0)::NUMERIC AS overdue_amount,
        COALESCE(SUM(CASE WHEN i.due_date = v_today
            THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END), 0)::NUMERIC AS due_today_amount,
        COUNT(i.id) AS invoice_count,
        COALESCE((SELECT SUM(CASE WHEN ob.direction = 'debit' THEN ob.amount ELSE -ob.amount END)
            FROM public.party_opening_balances ob
            WHERE ob.company_id = p_company_id AND ob.party_id = p_party_id), 0)::NUMERIC AS opening_balance,
        EXISTS (SELECT 1 FROM public.debt_payment_promises pp
            WHERE pp.company_id = p_company_id AND pp.party_id = p_party_id
              AND pp.status = 'broken') AS has_broken_promise,
        COALESCE((SELECT COUNT(*) FROM public.debt_payment_promises pp
            WHERE pp.company_id = p_company_id AND pp.party_id = p_party_id
              AND pp.status = 'pending'), 0)::BIGINT AS pending_promise_count,
        COALESCE((SELECT SUM(pp.amount) FROM public.debt_payment_promises pp
            WHERE pp.company_id = p_company_id AND pp.party_id = p_party_id
              AND pp.status = 'pending'), 0)::NUMERIC AS pending_promise_amount,
        (SELECT ml.created_at FROM public.debt_message_log ml
            WHERE ml.company_id = p_company_id AND ml.party_id = p_party_id
              AND ml.status = 'sent'
            ORDER BY ml.created_at DESC LIMIT 1) AS last_reminded_at,
        (SELECT ca.created_at FROM public.customer_activities ca
            WHERE ca.company_id = p_company_id AND ca.customer_id = p_party_id
            ORDER BY ca.created_at DESC LIMIT 1) AS last_contact_date
    FROM public.parties p
    LEFT JOIN public.party_categories pc ON pc.id = p.category_id
    LEFT JOIN public.invoices i
        ON i.party_id = p.id AND i.company_id = p_company_id
        AND i.type = 'sale' AND i.status IN ('posted', 'partial') AND i.deleted_at IS NULL
    WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    GROUP BY p.id, p.name, p.phone, pc.name, p.credit_limit;
END;
$$;

COMMENT ON FUNCTION public.get_debt_party_overview(UUID, UUID) IS
'Single-row financial overview for one party: outstanding, overdue, due today, promises, last reminder.';

-- ─────────────────────────────────────────────────────────────
-- 16. RPC: record_debt_reminder — audit a reminder in ONE transaction
--     (debt_message_log + customer_activities timeline)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_debt_reminder(
    p_company_id UUID,
    p_party_id UUID,
    p_message_text TEXT,
    p_channel VARCHAR DEFAULT 'whatsapp',
    p_template_id UUID DEFAULT NULL,
    p_recipient VARCHAR DEFAULT NULL,
    p_related_entity_type VARCHAR DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL
)
RETURNS TABLE(message_log_id UUID, activity_id UUID)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE v_msg_id UUID;
DECLARE v_act_id UUID;
BEGIN
    -- Tenant guard: party must belong to this company
    IF NOT EXISTS (
        SELECT 1 FROM public.parties p
        WHERE p.id = p_party_id AND p.company_id = p_company_id AND p.deleted_at IS NULL
    ) THEN
        RAISE EXCEPTION 'INVALID_PARTY';
    END IF;

    INSERT INTO public.debt_message_log (
        company_id, party_id, channel, template_id, message_text,
        status, recipient, related_entity_type, related_entity_id, created_by, sent_at
    ) VALUES (
        p_company_id, p_party_id, p_channel, p_template_id, p_message_text,
        'sent', p_recipient, p_related_entity_type, p_related_entity_id, auth.uid(), NOW()
    )
    RETURNING id INTO v_msg_id;

    INSERT INTO public.customer_activities (
        company_id, customer_id, activity_type, subject, description,
        status, priority, scheduled_at, completed_at, created_by
    ) VALUES (
        p_company_id, p_party_id, 'follow_up', 'تذكير دين', p_message_text,
        'completed', 'medium', NOW(), NOW(), auth.uid()
    )
    RETURNING id INTO v_act_id;

    RETURN QUERY SELECT v_msg_id, v_act_id;
END;
$$;

COMMENT ON FUNCTION public.record_debt_reminder(UUID, UUID, TEXT, VARCHAR, UUID, VARCHAR, VARCHAR, UUID) IS
'Records a sent debt reminder into debt_message_log and the customer_activities timeline in a single transaction.';


-- ─────────────────────────────────────────────────────────────
-- 17. RPC: break_overdue_promises — auto-mark expired pending promises
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.break_overdue_promises(
    p_company_id UUID
)
RETURNS SETOF UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    UPDATE public.debt_payment_promises
    SET status = 'broken', updated_at = NOW()
    WHERE company_id = p_company_id
      AND status = 'pending'
      AND promise_date < CURRENT_DATE
    RETURNING id;
END;
$$;

COMMENT ON FUNCTION public.break_overdue_promises(UUID) IS
'Automatically marks pending promises whose date has passed as broken. Returns the broken promise ids.';

-- ─────────────────────────────────────────────────────────────
-- 18. RPC: complete_promise — mark a promise fulfilled
--     (optionally linked to the created payment bond)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.complete_promise(
    p_company_id UUID,
    p_promise_id UUID,
    p_payment_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.debt_payment_promises
    SET status = 'completed',
        completed_at = NOW(),
        updated_at = NOW(),
        reference_type = CASE WHEN p_payment_id IS NOT NULL THEN 'payment' ELSE reference_type END,
        reference_id = COALESCE(p_payment_id, reference_id)
    WHERE id = p_promise_id
      AND company_id = p_company_id
      AND status = 'pending';
END;
$$;

COMMENT ON FUNCTION public.complete_promise(UUID, UUID, UUID) IS
'Marks a pending promise as completed and optionally links it to the payment bond id.';

