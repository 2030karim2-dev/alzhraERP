-- ============================================================
-- 20260825000006_internal_chat_collaboration_system.sql
--
-- ALZHRA ERP — Internal Chat & Real-Time Branch Collaboration System
--
-- Tables:
--   1. chat_channels
--   2. chat_channel_members
--   3. chat_messages
--   4. chat_message_attachments
--   5. chat_message_reactions
--
-- Security:
--   - Tenant isolation: company_id IN (SELECT get_auth_companies())
--   - Channel membership & branch permission guards
--   - Sender spoofing prevention (sender_id = auth.uid())
--   - Idempotent action requests (transfers, approvals)
--   - Storage bucket 'chat-attachments' with RLS
--   - Realtime publication enablement
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. CHAT CHANNELS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_channels (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type           TEXT NOT NULL CONSTRAINT chat_channels_type_check
                   CHECK (type IN ('direct', 'group', 'branch', 'department', 'topic', 'contextual')),
    name           TEXT NOT NULL,
    description    TEXT,
    branch_id      UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    reference_type TEXT,
    reference_id   UUID,
    is_private     BOOLEAN NOT NULL DEFAULT FALSE,
    created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at    TIMESTAMPTZ
);

COMMENT ON TABLE public.chat_channels IS
    'Channels and conversations for internal branch and employee communication in ALZHRA ERP.';

CREATE INDEX IF NOT EXISTS idx_chat_channels_company ON public.chat_channels(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_branch ON public.chat_channels(branch_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_type ON public.chat_channels(type);
CREATE INDEX IF NOT EXISTS idx_chat_channels_context ON public.chat_channels(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_chat_channels_updated_at ON public.chat_channels(updated_at DESC);

-- ────────────────────────────────────────────────────────────
-- 2. CHAT CHANNEL MEMBERS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_channel_members (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id           UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    user_id              UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role                 TEXT NOT NULL DEFAULT 'member'
                         CONSTRAINT chat_channel_members_role_check CHECK (role IN ('owner', 'admin', 'member')),
    last_read_message_id UUID,
    muted_until          TIMESTAMPTZ,
    joined_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at              TIMESTAMPTZ,
    CONSTRAINT chat_channel_members_unique UNIQUE (channel_id, user_id)
);

COMMENT ON TABLE public.chat_channel_members IS
    'Membership mapping for private, group, and direct chat channels with read states.';

CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_channel ON public.chat_channel_members(channel_id);

-- ────────────────────────────────────────────────────────────
-- 3. CHAT MESSAGES TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id        UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
    sender_id         UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    message_type      TEXT NOT NULL DEFAULT 'text'
                      CONSTRAINT chat_messages_type_check
                      CHECK (message_type IN ('text', 'image', 'file', 'entity_card', 'system', 'action_request')),
    content           TEXT NOT NULL DEFAULT '',
    metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
    reply_to_id       UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
    client_message_id TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at         TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT chat_messages_client_id_unique UNIQUE (channel_id, client_message_id)
);

COMMENT ON TABLE public.chat_messages IS
    'Persistent messages within chat channels with ERP entity cards and action request support.';

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created ON public.chat_messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply ON public.chat_messages(reply_to_id);

-- ────────────────────────────────────────────────────────────
-- 4. CHAT MESSAGE ATTACHMENTS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_message_attachments (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id   UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    file_name    TEXT NOT NULL,
    mime_type    TEXT NOT NULL DEFAULT 'application/octet-stream',
    file_size    BIGINT NOT NULL DEFAULT 0,
    uploaded_by  UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.chat_message_attachments IS
    'Metadata for files and photos attached to chat messages, stored in Supabase Storage.';

CREATE INDEX IF NOT EXISTS idx_chat_attachments_msg ON public.chat_message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_company ON public.chat_message_attachments(company_id);

-- ────────────────────────────────────────────────────────────
-- 5. CHAT MESSAGE REACTIONS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji      TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chat_message_reactions_unique UNIQUE (message_id, user_id, emoji)
);

COMMENT ON TABLE public.chat_message_reactions IS
    'Quick emoji reactions on chat messages.';

CREATE INDEX IF NOT EXISTS idx_chat_reactions_msg ON public.chat_message_reactions(message_id);

-- ────────────────────────────────────────────────────────────
-- 6. SECURITY HELPER FUNCTIONS (Channel Access Evaluation)
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_can_access_chat_channel(p_channel_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_channel RECORD;
    v_user_role RECORD;
BEGIN
    IF p_user_id IS NULL OR p_channel_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Fetch channel details
    SELECT id, company_id, type, branch_id, is_private
    INTO v_channel
    FROM public.chat_channels
    WHERE id = p_channel_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check if user belongs to this company
    SELECT role, branch_id
    INTO v_user_role
    FROM public.user_company_roles
    WHERE user_id = p_user_id AND company_id = v_channel.company_id
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Owners and Admins have universal access across the company
    IF v_user_role.role IN ('owner', 'admin') THEN
        RETURN TRUE;
    END IF;

    -- Check explicit membership
    IF EXISTS (
        SELECT 1 FROM public.chat_channel_members
        WHERE channel_id = p_channel_id AND user_id = p_user_id AND left_at IS NULL
    ) THEN
        RETURN TRUE;
    END IF;

    -- Public branch channels (accessible to employees in that branch or unassigned)
    IF NOT v_channel.is_private AND v_channel.type = 'branch' THEN
        IF v_channel.branch_id IS NULL OR v_user_role.branch_id IS NULL OR v_channel.branch_id = v_user_role.branch_id THEN
            RETURN TRUE;
        END IF;
    END IF;

    -- Public topic channels (accessible to all company staff)
    IF NOT v_channel.is_private AND v_channel.type IN ('topic', 'department') THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$function$;

-- ────────────────────────────────────────────────────────────
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ────────────────────────────────────────────────────────────

-- Enable RLS on all chat tables
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

-- 7.1 chat_channels policies
DROP POLICY IF EXISTS "chat_channels_select" ON public.chat_channels;
CREATE POLICY "chat_channels_select" ON public.chat_channels
    FOR SELECT TO authenticated
    USING (
        company_id IN (SELECT get_auth_companies())
        AND public.fn_can_access_chat_channel(id, auth.uid())
    );

DROP POLICY IF EXISTS "chat_channels_insert" ON public.chat_channels;
CREATE POLICY "chat_channels_insert" ON public.chat_channels
    FOR INSERT TO authenticated
    WITH CHECK (
        company_id IN (SELECT get_auth_companies())
        AND created_by = auth.uid()
    );

DROP POLICY IF EXISTS "chat_channels_update" ON public.chat_channels;
CREATE POLICY "chat_channels_update" ON public.chat_channels
    FOR UPDATE TO authenticated
    USING (
        company_id IN (SELECT get_auth_companies())
        AND (
            created_by = auth.uid()
            OR public.user_is_admin_or_manager(company_id)
        )
    );

-- 7.2 chat_channel_members policies
DROP POLICY IF EXISTS "chat_channel_members_select" ON public.chat_channel_members;
CREATE POLICY "chat_channel_members_select" ON public.chat_channel_members
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_channels c
            WHERE c.id = chat_channel_members.channel_id
              AND c.company_id IN (SELECT get_auth_companies())
              AND public.fn_can_access_chat_channel(c.id, auth.uid())
        )
    );

DROP POLICY IF EXISTS "chat_channel_members_insert" ON public.chat_channel_members;
CREATE POLICY "chat_channel_members_insert" ON public.chat_channel_members
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.chat_channels c
            WHERE c.id = chat_channel_members.channel_id
              AND c.company_id IN (SELECT get_auth_companies())
              AND (c.created_by = auth.uid() OR public.user_is_admin_or_manager(c.company_id))
        )
    );

DROP POLICY IF EXISTS "chat_channel_members_update" ON public.chat_channel_members;
CREATE POLICY "chat_channel_members_update" ON public.chat_channel_members
    FOR UPDATE TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.chat_channels c
            WHERE c.id = chat_channel_members.channel_id
              AND c.company_id IN (SELECT get_auth_companies())
              AND public.user_is_admin_or_manager(c.company_id)
        )
    );

-- 7.3 chat_messages policies
DROP POLICY IF EXISTS "chat_messages_select" ON public.chat_messages;
CREATE POLICY "chat_messages_select" ON public.chat_messages
    FOR SELECT TO authenticated
    USING (
        public.fn_can_access_chat_channel(channel_id, auth.uid())
    );

DROP POLICY IF EXISTS "chat_messages_insert" ON public.chat_messages;
CREATE POLICY "chat_messages_insert" ON public.chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND public.fn_can_access_chat_channel(channel_id, auth.uid())
    );

DROP POLICY IF EXISTS "chat_messages_update" ON public.chat_messages;
CREATE POLICY "chat_messages_update" ON public.chat_messages
    FOR UPDATE TO authenticated
    USING (
        sender_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.chat_channels c
            WHERE c.id = chat_messages.channel_id
              AND public.user_is_admin_or_manager(c.company_id)
        )
    );

-- 7.4 chat_message_attachments policies
DROP POLICY IF EXISTS "chat_attachments_select" ON public.chat_message_attachments;
CREATE POLICY "chat_attachments_select" ON public.chat_message_attachments
    FOR SELECT TO authenticated
    USING (
        company_id IN (SELECT get_auth_companies())
        AND EXISTS (
            SELECT 1 FROM public.chat_messages m
            WHERE m.id = chat_message_attachments.message_id
              AND public.fn_can_access_chat_channel(m.channel_id, auth.uid())
        )
    );

DROP POLICY IF EXISTS "chat_attachments_insert" ON public.chat_message_attachments;
CREATE POLICY "chat_attachments_insert" ON public.chat_message_attachments
    FOR INSERT TO authenticated
    WITH CHECK (
        company_id IN (SELECT get_auth_companies())
        AND uploaded_by = auth.uid()
    );

-- 7.5 chat_message_reactions policies
DROP POLICY IF EXISTS "chat_reactions_select" ON public.chat_message_reactions;
CREATE POLICY "chat_reactions_select" ON public.chat_message_reactions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.chat_messages m
            WHERE m.id = chat_message_reactions.message_id
              AND public.fn_can_access_chat_channel(m.channel_id, auth.uid())
        )
    );

DROP POLICY IF EXISTS "chat_reactions_insert" ON public.chat_message_reactions;
CREATE POLICY "chat_reactions_insert" ON public.chat_message_reactions
    FOR INSERT TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.chat_messages m
            WHERE m.id = chat_message_reactions.message_id
              AND public.fn_can_access_chat_channel(m.channel_id, auth.uid())
        )
    );

DROP POLICY IF EXISTS "chat_reactions_delete" ON public.chat_message_reactions;
CREATE POLICY "chat_reactions_delete" ON public.chat_message_reactions
    FOR DELETE TO authenticated
    USING (
        user_id = auth.uid()
    );

-- ────────────────────────────────────────────────────────────
-- 8. STORAGE BUCKET & POLICIES ('chat-attachments')
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "chat_storage_insert" ON storage.objects;
CREATE POLICY "chat_storage_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'chat-attachments'
        AND (storage.foldername(name))[1] IN (
            SELECT company_id::text FROM public.user_company_roles WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "chat_storage_select" ON storage.objects;
CREATE POLICY "chat_storage_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'chat-attachments'
        AND (storage.foldername(name))[1] IN (
            SELECT company_id::text FROM public.user_company_roles WHERE user_id = auth.uid()
        )
    );

-- ────────────────────────────────────────────────────────────
-- 9. SECURE RPC FUNCTIONS FOR FRONTEND & IDEMPOTENT ACTIONS
-- ────────────────────────────────────────────────────────────

-- 9.1 Send Message RPC (With channel update and validation)
CREATE OR REPLACE FUNCTION public.rpc_send_chat_message(
    p_channel_id UUID,
    p_content TEXT,
    p_message_type TEXT DEFAULT 'text',
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_reply_to_id UUID DEFAULT NULL,
    p_client_message_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_msg_id UUID;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User not authenticated';
    END IF;

    -- Validate channel access
    IF NOT public.fn_can_access_chat_channel(p_channel_id, v_user_id) THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to post in this channel';
    END IF;

    -- Handle idempotency for client_message_id
    IF p_client_message_id IS NOT NULL THEN
        SELECT id INTO v_msg_id
        FROM public.chat_messages
        WHERE channel_id = p_channel_id AND client_message_id = p_client_message_id;

        IF FOUND THEN
            SELECT jsonb_build_object(
                'id', id,
                'channel_id', channel_id,
                'sender_id', sender_id,
                'content', content,
                'message_type', message_type,
                'metadata', metadata,
                'created_at', created_at,
                'is_duplicate', true
            ) INTO v_result
            FROM public.chat_messages WHERE id = v_msg_id;

            RETURN v_result;
        END IF;
    END IF;

    -- Insert new message
    INSERT INTO public.chat_messages (
        channel_id,
        sender_id,
        message_type,
        content,
        metadata,
        reply_to_id,
        client_message_id
    ) VALUES (
        p_channel_id,
        v_user_id,
        p_message_type,
        COALESCE(p_content, ''),
        COALESCE(p_metadata, '{}'::jsonb),
        p_reply_to_id,
        p_client_message_id
    )
    RETURNING id INTO v_msg_id;

    -- Update channel updated_at
    UPDATE public.chat_channels
    SET updated_at = NOW()
    WHERE id = p_channel_id;

    -- Update sender's last read message
    INSERT INTO public.chat_channel_members (channel_id, user_id, last_read_message_id, joined_at)
    VALUES (p_channel_id, v_user_id, v_msg_id, NOW())
    ON CONFLICT (channel_id, user_id)
    DO UPDATE SET last_read_message_id = v_msg_id;

    -- Build return payload
    SELECT jsonb_build_object(
        'id', m.id,
        'channel_id', m.channel_id,
        'sender_id', m.sender_id,
        'content', m.content,
        'message_type', m.message_type,
        'metadata', m.metadata,
        'reply_to_id', m.reply_to_id,
        'client_message_id', m.client_message_id,
        'created_at', m.created_at
    ) INTO v_result
    FROM public.chat_messages m
    WHERE m.id = v_msg_id;

    RETURN v_result;
END;
$function$;

-- 9.2 Get or Create Direct Chat Channel RPC
CREATE OR REPLACE FUNCTION public.rpc_get_or_create_direct_channel(
    p_company_id UUID,
    p_target_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_company UUID;
    v_channel_id UUID;
    v_target_name TEXT;
    v_current_name TEXT;
BEGIN
    v_user_id := auth.uid();
    v_company := public.verify_company_access(p_company_id);

    IF v_user_id = p_target_user_id THEN
        RAISE EXCEPTION 'Cannot create direct conversation with yourself';
    END IF;

    -- Check if target user exists in company
    IF NOT EXISTS (
        SELECT 1 FROM public.user_company_roles
        WHERE user_id = p_target_user_id AND company_id = v_company
    ) THEN
        RAISE EXCEPTION 'Target user does not belong to this company';
    END IF;

    -- Find existing 1-on-1 direct channel between these two users
    SELECT c.id INTO v_channel_id
    FROM public.chat_channels c
    JOIN public.chat_channel_members m1 ON m1.channel_id = c.id AND m1.user_id = v_user_id
    JOIN public.chat_channel_members m2 ON m2.channel_id = c.id AND m2.user_id = p_target_user_id
    WHERE c.company_id = v_company
      AND c.type = 'direct'
      AND c.archived_at IS NULL
    LIMIT 1;

    IF v_channel_id IS NOT NULL THEN
        RETURN v_channel_id;
    END IF;

    -- Get user names for channel title
    SELECT full_name INTO v_target_name FROM public.profiles WHERE id = p_target_user_id;
    SELECT full_name INTO v_current_name FROM public.profiles WHERE id = v_user_id;

    -- Create new direct channel
    INSERT INTO public.chat_channels (
        company_id,
        type,
        name,
        is_private,
        created_by
    ) VALUES (
        v_company,
        'direct',
        COALESCE(v_target_name, 'محادثة خاصة'),
        TRUE,
        v_user_id
    )
    RETURNING id INTO v_channel_id;

    -- Add both members
    INSERT INTO public.chat_channel_members (channel_id, user_id, role)
    VALUES
        (v_channel_id, v_user_id, 'owner'),
        (v_channel_id, p_target_user_id, 'member');

    RETURN v_channel_id;
END;
$function$;

-- 9.3 Get or Create Contextual ERP Channel RPC
CREATE OR REPLACE FUNCTION public.rpc_get_or_create_contextual_channel(
    p_company_id UUID,
    p_reference_type TEXT,
    p_reference_id UUID,
    p_channel_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_company UUID;
    v_channel_id UUID;
BEGIN
    v_user_id := auth.uid();
    v_company := public.verify_company_access(p_company_id);

    -- Find existing contextual channel
    SELECT id INTO v_channel_id
    FROM public.chat_channels
    WHERE company_id = v_company
      AND reference_type = p_reference_type
      AND reference_id = p_reference_id
      AND archived_at IS NULL
    LIMIT 1;

    IF v_channel_id IS NOT NULL THEN
        -- Ensure current user is joined
        INSERT INTO public.chat_channel_members (channel_id, user_id, role)
        VALUES (v_channel_id, v_user_id, 'member')
        ON CONFLICT (channel_id, user_id) DO NOTHING;

        RETURN v_channel_id;
    END IF;

    -- Create new contextual channel
    INSERT INTO public.chat_channels (
        company_id,
        type,
        name,
        reference_type,
        reference_id,
        is_private,
        created_by
    ) VALUES (
        v_company,
        'contextual',
        p_channel_name,
        p_reference_type,
        p_reference_id,
        FALSE,
        v_user_id
    )
    RETURNING id INTO v_channel_id;

    -- Add creator as member
    INSERT INTO public.chat_channel_members (channel_id, user_id, role)
    VALUES (v_channel_id, v_user_id, 'owner')
    ON CONFLICT (channel_id, user_id) DO NOTHING;

    RETURN v_channel_id;
END;
$function$;

-- 9.4 Mark Channel as Read RPC
CREATE OR REPLACE FUNCTION public.rpc_mark_channel_read(
    p_channel_id UUID,
    p_last_message_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_target_msg_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN;
    END IF;

    IF p_last_message_id IS NULL THEN
        SELECT id INTO v_target_msg_id
        FROM public.chat_messages
        WHERE channel_id = p_channel_id
        ORDER BY created_at DESC
        LIMIT 1;
    ELSE
        v_target_msg_id := p_last_message_id;
    END IF;

    INSERT INTO public.chat_channel_members (channel_id, user_id, last_read_message_id, joined_at)
    VALUES (p_channel_id, v_user_id, v_target_msg_id, NOW())
    ON CONFLICT (channel_id, user_id)
    DO UPDATE SET last_read_message_id = COALESCE(v_target_msg_id, chat_channel_members.last_read_message_id);
END;
$function$;

-- 9.5 Idempotent Action Request Execution RPC (Approvals & Transfers)
CREATE OR REPLACE FUNCTION public.rpc_execute_chat_action(
    p_message_id UUID,
    p_action TEXT, -- 'approve' | 'reject' | 'cancel'
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_msg RECORD;
    v_channel RECORD;
    v_metadata JSONB;
    v_current_status TEXT;
    v_user_role TEXT;
    v_updated_metadata JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User not authenticated';
    END IF;

    -- Lock message row for update to prevent concurrent duplicate approvals
    SELECT m.*, c.company_id
    INTO v_msg
    FROM public.chat_messages m
    JOIN public.chat_channels c ON c.id = m.channel_id
    WHERE m.id = p_message_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Message not found';
    END IF;

    IF v_msg.message_type != 'action_request' THEN
        RAISE EXCEPTION 'Message is not an action request';
    END IF;

    v_metadata := v_msg.metadata;
    v_current_status := COALESCE(v_metadata->>'action_status', 'pending');

    -- Check Idempotency
    IF v_current_status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('This action has already been %s', v_current_status),
            'status', v_current_status,
            'already_processed', true
        );
    END IF;

    -- Check Authorization: Only Admin / Manager or target approver can approve
    SELECT role INTO v_user_role
    FROM public.user_company_roles
    WHERE user_id = v_user_id AND company_id = v_msg.company_id
    LIMIT 1;

    IF v_user_role NOT IN ('owner', 'admin', 'manager') AND v_metadata->>'target_user_id' != v_user_id::text THEN
        RAISE EXCEPTION 'Access Denied: You do not have authority to approve this action';
    END IF;

    -- Update metadata status
    v_updated_metadata := v_metadata || jsonb_build_object(
        'action_status', p_action,
        'action_by', v_user_id,
        'action_at', NOW(),
        'action_notes', p_notes
    );

    UPDATE public.chat_messages
    SET metadata = v_updated_metadata,
        edited_at = NOW()
    WHERE id = p_message_id;

    -- Record Audit Log
    INSERT INTO public.audit_logs (
        company_id,
        user_id,
        action,
        entity,
        entity_id,
        details
    ) VALUES (
        v_msg.company_id,
        v_user_id,
        'CHAT_ACTION_' || UPPER(p_action),
        'chat_messages',
        p_message_id,
        jsonb_build_object(
            'previous_status', v_current_status,
            'new_status', p_action,
            'action_type', v_metadata->>'action_type',
            'entity_id', v_metadata->>'entity_id',
            'notes', p_notes
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', p_action,
        'message', format('Action %s successfully processed', p_action)
    );
END;
$function$;

-- ────────────────────────────────────────────────────────────
-- 10. REALTIME PUBLICATION COVERAGE
-- ────────────────────────────────────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channel_members;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_attachments;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Table may already be in publication; ignore error
    NULL;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- 11. GRANT PRIVILEGES TO APP ROLES
-- ────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_channels TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_channel_members TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_message_attachments TO authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON public.chat_message_reactions TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.fn_can_access_chat_channel(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_send_chat_message(UUID, TEXT, TEXT, JSONB, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_get_or_create_direct_channel(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_get_or_create_contextual_channel(UUID, TEXT, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_mark_channel_read(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_execute_chat_action(UUID, TEXT, TEXT) TO authenticated, service_role;
