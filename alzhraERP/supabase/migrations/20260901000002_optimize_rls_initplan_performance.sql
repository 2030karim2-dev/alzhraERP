-- Migration: 20260901000002_optimize_rls_initplan_performance.sql
-- Description: Optimizes RLS policies by wrapping auth.uid() with (SELECT auth.uid())
-- to enable PostgreSQL query planner InitPlan caching, preventing per-row re-evaluation and CPU spikes.

-- ==========================================
-- 1. ai_request_log
-- ==========================================
DROP POLICY IF EXISTS "ai_request_log_own_rows" ON public.ai_request_log;
CREATE POLICY "ai_request_log_own_rows" ON public.ai_request_log
FOR ALL TO authenticated
USING ((user_id = (SELECT auth.uid())) OR is_super_admin())
WITH CHECK ((user_id = (SELECT auth.uid())) OR is_super_admin());

-- ==========================================
-- 2. chat_channels
-- ==========================================
DROP POLICY IF EXISTS "chat_channels_select" ON public.chat_channels;
CREATE POLICY "chat_channels_select" ON public.chat_channels
FOR SELECT TO authenticated
USING (
  (company_id IN (SELECT get_auth_companies())) AND
  (
    (created_by = (SELECT auth.uid())) OR
    (is_private = false) OR
    fn_can_access_chat_channel(id, (SELECT auth.uid()))
  )
);

-- ==========================================
-- 3. chat_channel_members
-- ==========================================
DROP POLICY IF EXISTS "chat_channel_members_select" ON public.chat_channel_members;
CREATE POLICY "chat_channel_members_select" ON public.chat_channel_members
FOR SELECT TO authenticated
USING (
  (user_id = (SELECT auth.uid())) OR
  (EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = chat_channel_members.channel_id
      AND c.company_id IN (SELECT get_auth_companies())
      AND (
        c.created_by = (SELECT auth.uid()) OR
        c.is_private = false OR
        fn_can_access_chat_channel(c.id, (SELECT auth.uid()))
      )
  ))
);

DROP POLICY IF EXISTS "chat_channel_members_insert" ON public.chat_channel_members;
CREATE POLICY "chat_channel_members_insert" ON public.chat_channel_members
FOR INSERT TO authenticated
WITH CHECK (
  (user_id = (SELECT auth.uid())) OR
  (EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = chat_channel_members.channel_id
      AND c.company_id IN (SELECT get_auth_companies())
  ))
);

DROP POLICY IF EXISTS "chat_channel_members_update" ON public.chat_channel_members;
CREATE POLICY "chat_channel_members_update" ON public.chat_channel_members
FOR UPDATE TO authenticated
USING (
  (user_id = (SELECT auth.uid())) OR
  (EXISTS (
    SELECT 1 FROM chat_channels c
    WHERE c.id = chat_channel_members.channel_id
      AND c.company_id IN (SELECT get_auth_companies())
      AND user_is_admin_or_manager(c.company_id)
  ))
);

-- ==========================================
-- 4. chat_message_attachments
-- ==========================================
DROP POLICY IF EXISTS "chat_attachments_insert" ON public.chat_message_attachments;
CREATE POLICY "chat_attachments_insert" ON public.chat_message_attachments
FOR INSERT TO authenticated
WITH CHECK (
  (company_id IN (SELECT get_auth_companies())) AND
  (uploaded_by = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS "chat_attachments_select" ON public.chat_message_attachments;
CREATE POLICY "chat_attachments_select" ON public.chat_message_attachments
FOR SELECT TO authenticated
USING (
  (company_id IN (SELECT get_auth_companies())) AND
  (EXISTS (
    SELECT 1 FROM chat_messages m
    WHERE m.id = chat_message_attachments.message_id
      AND fn_can_access_chat_channel(m.channel_id, (SELECT auth.uid()))
  ))
);

-- ==========================================
-- 5. chat_message_reactions
-- ==========================================
DROP POLICY IF EXISTS "chat_reactions_select" ON public.chat_message_reactions;
CREATE POLICY "chat_reactions_select" ON public.chat_message_reactions
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chat_messages m
    WHERE m.id = chat_message_reactions.message_id
      AND fn_can_access_chat_channel(m.channel_id, (SELECT auth.uid()))
  )
);

DROP POLICY IF EXISTS "chat_reactions_insert" ON public.chat_message_reactions;
CREATE POLICY "chat_reactions_insert" ON public.chat_message_reactions
FOR INSERT TO authenticated
WITH CHECK (
  (user_id = (SELECT auth.uid())) AND
  (EXISTS (
    SELECT 1 FROM chat_messages m
    WHERE m.id = chat_message_reactions.message_id
      AND fn_can_access_chat_channel(m.channel_id, (SELECT auth.uid()))
  ))
);

DROP POLICY IF EXISTS "chat_reactions_delete" ON public.chat_message_reactions;
CREATE POLICY "chat_reactions_delete" ON public.chat_message_reactions
FOR DELETE TO authenticated
USING (user_id = (SELECT auth.uid()));

-- ==========================================
-- 6. party_opening_balances
-- ==========================================
DROP POLICY IF EXISTS "party_opening_balances_branch_isolation" ON public.party_opening_balances;
CREATE POLICY "party_opening_balances_branch_isolation" ON public.party_opening_balances
FOR ALL TO authenticated
USING (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) AND
  (is_main_branch_or_admin(company_id) OR (branch_id IS NULL) OR (branch_id = get_user_branch_id(company_id)))
)
WITH CHECK (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) AND
  (is_main_branch_or_admin(company_id) OR (branch_id IS NULL) OR (branch_id = get_user_branch_id(company_id)))
);

-- ==========================================
-- 7. prc_rfqs & prc_rfq_items
-- ==========================================
DROP POLICY IF EXISTS "prc_rfqs_select_policy" ON public.prc_rfqs;
CREATE POLICY "prc_rfqs_select_policy" ON public.prc_rfqs
FOR SELECT TO authenticated
USING (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) OR
  (rfq_id IN (
    SELECT prs.rfq_id FROM prc_rfq_suppliers prs
    WHERE prs.supplier_id = get_user_supplier_id((SELECT auth.uid()))
  ))
);

DROP POLICY IF EXISTS "prc_rfqs_insert_policy" ON public.prc_rfqs;
CREATE POLICY "prc_rfqs_insert_policy" ON public.prc_rfqs
FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "prc_rfqs_update_policy" ON public.prc_rfqs;
CREATE POLICY "prc_rfqs_update_policy" ON public.prc_rfqs
FOR UPDATE TO authenticated
USING (
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "prc_rfqs_delete_policy" ON public.prc_rfqs;
CREATE POLICY "prc_rfqs_delete_policy" ON public.prc_rfqs
FOR DELETE TO authenticated
USING (
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "prc_rfq_items_select_policy" ON public.prc_rfq_items;
CREATE POLICY "prc_rfq_items_select_policy" ON public.prc_rfq_items
FOR SELECT TO authenticated
USING (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) OR
  (rfq_id IN (
    SELECT prs.rfq_id FROM prc_rfq_suppliers prs
    WHERE prs.supplier_id = get_user_supplier_id((SELECT auth.uid()))
  ))
);

DROP POLICY IF EXISTS "prc_rfq_items_insert_policy" ON public.prc_rfq_items;
CREATE POLICY "prc_rfq_items_insert_policy" ON public.prc_rfq_items
FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "prc_rfq_items_update_policy" ON public.prc_rfq_items;
CREATE POLICY "prc_rfq_items_update_policy" ON public.prc_rfq_items
FOR UPDATE TO authenticated
USING (
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "prc_rfq_items_delete_policy" ON public.prc_rfq_items;
CREATE POLICY "prc_rfq_items_delete_policy" ON public.prc_rfq_items
FOR DELETE TO authenticated
USING (
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )
);

-- ==========================================
-- 8. prc_quotations & items & revisions
-- ==========================================
DROP POLICY IF EXISTS "prc_quotations_select_policy" ON public.prc_quotations;
CREATE POLICY "prc_quotations_select_policy" ON public.prc_quotations
FOR SELECT TO authenticated
USING (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) OR
  (supplier_id = get_user_supplier_id((SELECT auth.uid())))
);

DROP POLICY IF EXISTS "prc_quotations_insert_policy" ON public.prc_quotations;
CREATE POLICY "prc_quotations_insert_policy" ON public.prc_quotations
FOR INSERT TO authenticated
WITH CHECK (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) OR
  (supplier_id = get_user_supplier_id((SELECT auth.uid())))
);

DROP POLICY IF EXISTS "prc_quotations_update_policy" ON public.prc_quotations;
CREATE POLICY "prc_quotations_update_policy" ON public.prc_quotations
FOR UPDATE TO authenticated
USING (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) OR
  (
    supplier_id = get_user_supplier_id((SELECT auth.uid())) AND
    status IN ('draft', 'submitted')
  )
);

DROP POLICY IF EXISTS "prc_quotations_delete_policy" ON public.prc_quotations;
CREATE POLICY "prc_quotations_delete_policy" ON public.prc_quotations
FOR DELETE TO authenticated
USING (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) OR
  (
    supplier_id = get_user_supplier_id((SELECT auth.uid())) AND
    status = 'draft'
  )
);

DROP POLICY IF EXISTS "prc_quotation_items_select_policy" ON public.prc_quotation_items;
CREATE POLICY "prc_quotation_items_select_policy" ON public.prc_quotation_items
FOR SELECT TO authenticated
USING (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) OR
  (quotation_id IN (
    SELECT q.quotation_id FROM prc_quotations q
    WHERE q.supplier_id = get_user_supplier_id((SELECT auth.uid()))
  ))
);

DROP POLICY IF EXISTS "prc_quotation_items_insert_policy" ON public.prc_quotation_items;
CREATE POLICY "prc_quotation_items_insert_policy" ON public.prc_quotation_items
FOR INSERT TO authenticated
WITH CHECK (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) OR
  (quotation_id IN (
    SELECT q.quotation_id FROM prc_quotations q
    WHERE q.supplier_id = get_user_supplier_id((SELECT auth.uid()))
  ))
);

DROP POLICY IF EXISTS "prc_quotation_items_update_policy" ON public.prc_quotation_items;
CREATE POLICY "prc_quotation_items_update_policy" ON public.prc_quotation_items
FOR UPDATE TO authenticated
USING (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) OR
  (quotation_id IN (
    SELECT q.quotation_id FROM prc_quotations q
    WHERE q.supplier_id = get_user_supplier_id((SELECT auth.uid()))
      AND q.status IN ('draft', 'submitted')
  ))
);

DROP POLICY IF EXISTS "prc_quotation_items_delete_policy" ON public.prc_quotation_items;
CREATE POLICY "prc_quotation_items_delete_policy" ON public.prc_quotation_items
FOR DELETE TO authenticated
USING (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) OR
  (quotation_id IN (
    SELECT q.quotation_id FROM prc_quotations q
    WHERE q.supplier_id = get_user_supplier_id((SELECT auth.uid()))
      AND q.status IN ('draft', 'submitted')
  ))
);

DROP POLICY IF EXISTS "prc_quotation_revisions_select_policy" ON public.prc_quotation_revisions;
CREATE POLICY "prc_quotation_revisions_select_policy" ON public.prc_quotation_revisions
FOR SELECT TO authenticated
USING (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) OR
  (quotation_id IN (
    SELECT q.quotation_id FROM prc_quotations q
    WHERE q.supplier_id = get_user_supplier_id((SELECT auth.uid()))
  ))
);

DROP POLICY IF EXISTS "prc_quotation_revisions_insert_policy" ON public.prc_quotation_revisions;
CREATE POLICY "prc_quotation_revisions_insert_policy" ON public.prc_quotation_revisions
FOR INSERT TO authenticated
WITH CHECK (
  (company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )) OR
  (quotation_id IN (
    SELECT q.quotation_id FROM prc_quotations q
    WHERE q.supplier_id = get_user_supplier_id((SELECT auth.uid()))
  ))
);

-- ==========================================
-- 9. procurement_audit_logs
-- ==========================================
DROP POLICY IF EXISTS "Company staff access procurement_audit_logs" ON public.procurement_audit_logs;
CREATE POLICY "Company staff access procurement_audit_logs" ON public.procurement_audit_logs
FOR ALL TO authenticated
USING (
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
  )
);
