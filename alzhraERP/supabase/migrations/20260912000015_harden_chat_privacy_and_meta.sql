-- Migration: harden chat privacy, idempotency, and channel metadata performance
-- C1: close forced self-join on private/direct channels
-- C2: rpc_mark_channel_read verifies channel access before membership
-- C3: serialize direct-channel creation (advisory lock)
-- C4: rpc_execute_chat_action requires channel access + whitelisted actions
-- C5: attachment insert requires channel access
-- F2/F3: rpc_get_channels_with_meta replaces N+1 with one call
-- F9: rpc_send_chat_message validates type + length + reply target

BEGIN;

-- --- 1. Tighten chat_channel_members_insert: self-join only for public channels ---
DROP POLICY IF EXISTS "chat_channel_members_insert" ON public.chat_channel_members;
CREATE POLICY "chat_channel_members_insert" ON public.chat_channel_members
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.chat_channels c
    WHERE c.id = chat_channel_members.channel_id
      AND c.company_id IN (SELECT get_auth_companies())
      AND (
        (chat_channel_members.user_id <> auth.uid()
          AND (c.created_by = auth.uid() OR public.user_is_admin_or_manager(c.company_id)))
        OR (chat_channel_members.user_id = auth.uid()
          AND (c.is_private = FALSE OR public.user_is_admin_or_manager(c.company_id)))
      )
  )
);

-- --- 2. rpc_mark_channel_read: verify access before creating membership ---
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
    IF NOT public.fn_can_access_chat_channel(p_channel_id, v_user_id) THEN
        RAISE EXCEPTION 'Access Denied: You do not have access to this channel';
    END IF;
    IF p_last_message_id IS NULL THEN
        SELECT id INTO v_target_msg_id
        FROM public.chat_messages
        WHERE channel_id = p_channel_id
        ORDER BY created_at DESC
        LIMIT 1;
    ELSE
        SELECT id INTO v_target_msg_id
        FROM public.chat_messages
        WHERE id = p_last_message_id AND channel_id = p_channel_id;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Message does not belong to this channel';
        END IF;
    END IF;
    INSERT INTO public.chat_channel_members (channel_id, user_id, last_read_message_id, joined_at)
    VALUES (p_channel_id, v_user_id, v_target_msg_id, NOW())
    ON CONFLICT (channel_id, user_id)
    DO UPDATE SET last_read_message_id = COALESCE(v_target_msg_id, chat_channel_members.last_read_message_id);
END;
$function$;

-- --- 3. Serialize direct-channel creation to avoid duplicates ---
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
BEGIN
    v_user_id := auth.uid();
    v_company := public.verify_company_access(p_company_id);
    IF v_user_id = p_target_user_id THEN
        RAISE EXCEPTION 'Cannot create direct conversation with yourself';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.user_company_roles
        WHERE user_id = p_target_user_id AND company_id = v_company
    ) THEN
        RAISE EXCEPTION 'Target user does not belong to this company';
    END IF;
    PERFORM pg_advisory_xact_lock(
        hashtext('direct_chat:' || v_company::text || ':' ||
            LEAST(v_user_id::text, p_target_user_id::text) || ':' ||
            GREATEST(v_user_id::text, p_target_user_id::text))
    );
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
    SELECT full_name INTO v_target_name FROM public.profiles WHERE id = p_target_user_id;
    INSERT INTO public.chat_channels (company_id, type, name, is_private, created_by)
    VALUES (v_company, 'direct', COALESCE(v_target_name, 'محادثة خاصة'), TRUE, v_user_id)
    RETURNING id INTO v_channel_id;
    INSERT INTO public.chat_channel_members (channel_id, user_id, role)
    VALUES (v_channel_id, v_user_id, 'owner'), (v_channel_id, p_target_user_id, 'member')
    ON CONFLICT (channel_id, user_id) DO NOTHING;
    RETURN v_channel_id;
END;
$function$;

-- --- 4. rpc_execute_chat_action: membership check + whitelisted actions ---
CREATE OR REPLACE FUNCTION public.rpc_execute_chat_action(
    p_message_id UUID,
    p_action TEXT,
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
    v_metadata JSONB;
    v_current_status TEXT;
    v_user_role TEXT;
    v_updated_metadata JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User not authenticated';
    END IF;
    IF p_action NOT IN ('approve', 'reject', 'cancel') THEN
        RAISE EXCEPTION 'Invalid action: must be approve, reject, or cancel';
    END IF;
    SELECT m.*, c.company_id INTO v_msg
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
    IF NOT public.fn_can_access_chat_channel(v_msg.channel_id, v_user_id) THEN
        RAISE EXCEPTION 'Access Denied: You do not have access to this channel';
    END IF;
    v_metadata := v_msg.metadata;
    v_current_status := COALESCE(v_metadata->>'action_status', 'pending');
    IF v_current_status != 'pending' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('This action has already been %s', v_current_status),
            'status', v_current_status,
            'already_processed', true
        );
    END IF;
    SELECT role INTO v_user_role
    FROM public.user_company_roles
    WHERE user_id = v_user_id AND company_id = v_msg.company_id
    LIMIT 1;
    IF v_user_role NOT IN ('owner', 'admin', 'manager') AND v_metadata->>'target_user_id' != v_user_id::text THEN
        RAISE EXCEPTION 'Access Denied: You do not have authority to approve this action';
    END IF;
    v_updated_metadata := v_metadata || jsonb_build_object(
        'action_status', p_action, 'action_by', v_user_id, 'action_at', NOW(), 'action_notes', p_notes
    );
    UPDATE public.chat_messages SET metadata = v_updated_metadata, edited_at = NOW()
    WHERE id = p_message_id;
    INSERT INTO public.audit_logs (company_id, user_id, action, entity, entity_id, details)
    VALUES (v_msg.company_id, v_user_id, 'CHAT_ACTION_' || UPPER(p_action), 'chat_messages', p_message_id,
        jsonb_build_object('previous_status', v_current_status, 'new_status', p_action,
            'action_type', v_metadata->>'action_type', 'entity_id', v_metadata->>'entity_id', 'notes', p_notes));
    RETURN jsonb_build_object('success', true, 'status', p_action,
        'message', format('Action %s successfully processed', p_action));
END;
$function$;

-- --- 5. Attachment metadata insert: require channel access ---
DROP POLICY IF EXISTS "chat_attachments_insert" ON public.chat_message_attachments;
CREATE POLICY "chat_attachments_insert" ON public.chat_message_attachments
FOR INSERT TO authenticated
WITH CHECK (
    company_id IN (SELECT get_auth_companies())
    AND uploaded_by = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.chat_messages m
        WHERE m.id = chat_message_attachments.message_id
          AND public.fn_can_access_chat_channel(m.channel_id, auth.uid())
    )
);

-- --- 6a. rpc_send_chat_message: validation header (access + type + length) ---
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
    IF p_message_type NOT IN ('text', 'image', 'file', 'entity_card', 'system', 'action_request') THEN
        RAISE EXCEPTION 'Invalid message_type';
    END IF;
    IF p_content IS NOT NULL AND char_length(p_content) > 4000 THEN
        RAISE EXCEPTION 'Message content exceeds 4000 characters';
    END IF;
    IF NOT public.fn_can_access_chat_channel(p_channel_id, v_user_id) THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to post in this channel';
    END IF;
    IF p_reply_to_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.chat_messages
        WHERE id = p_reply_to_id AND channel_id = p_channel_id
    ) THEN
        RAISE EXCEPTION 'Reply target does not belong to this channel';
    END IF;
    IF p_client_message_id IS NOT NULL THEN
        SELECT id INTO v_msg_id FROM public.chat_messages
        WHERE channel_id = p_channel_id AND client_message_id = p_client_message_id;
        IF FOUND THEN
            SELECT jsonb_build_object(
                'id', id, 'channel_id', channel_id, 'sender_id', sender_id,
                'content', content, 'message_type', message_type, 'metadata', metadata,
                'created_at', created_at, 'is_duplicate', true
            ) INTO v_result FROM public.chat_messages WHERE id = v_msg_id;
            RETURN v_result;
        END IF;
    END IF;
    INSERT INTO public.chat_messages (channel_id, sender_id, message_type, content, metadata, reply_to_id, client_message_id)
    VALUES (p_channel_id, v_user_id, p_message_type, COALESCE(p_content, ''),
        COALESCE(p_metadata, '{}'::jsonb), p_reply_to_id, p_client_message_id)
    RETURNING id INTO v_msg_id;
    UPDATE public.chat_channels SET updated_at = NOW() WHERE id = p_channel_id;
    INSERT INTO public.chat_channel_members (channel_id, user_id, last_read_message_id, joined_at)
    VALUES (p_channel_id, v_user_id, v_msg_id, NOW())
    ON CONFLICT (channel_id, user_id)
    DO UPDATE SET last_read_message_id = v_msg_id;
    SELECT jsonb_build_object(
        'id', m.id, 'channel_id', m.channel_id, 'sender_id', m.sender_id,
        'content', m.content, 'message_type', m.message_type, 'metadata', m.metadata,
        'reply_to_id', m.reply_to_id, 'client_message_id', m.client_message_id, 'created_at', m.created_at
    ) INTO v_result FROM public.chat_messages m WHERE m.id = v_msg_id;
    RETURN v_result;
END;
$function$;

-- --- 7. Single-call channel metadata: last message + true unread count ---
CREATE OR REPLACE FUNCTION public.rpc_get_channels_with_meta(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_user_id UUID;
    v_company UUID;
    v_result JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: User not authenticated';
    END IF;
    v_company := public.verify_company_access(p_company_id);
    SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_result FROM (
        SELECT c.id, c.company_id, c.type, c.name, c.description, c.branch_id,
            c.reference_type, c.reference_id, c.is_private, c.created_by,
            c.created_at, c.updated_at, c.archived_at,
            b.name AS branch_name,
            (SELECT COUNT(*) FROM public.chat_channel_members m WHERE m.channel_id = c.id) AS members_count,
            me.last_read_message_id,
            lm.id AS last_message_id, lm.content AS last_message_content,
            lm.message_type AS last_message_type, lm.sender_id AS last_message_sender_id,
            lm.created_at AS last_message_created_at,
            sp.full_name AS last_message_sender_name, sp.avatar_url AS last_message_sender_avatar,
            (
                SELECT COUNT(*) FROM public.chat_messages m2
                WHERE m2.channel_id = c.id AND m2.sender_id <> v_user_id AND m2.deleted_at IS NULL
                  AND (me.last_read_message_id IS NULL
                    OR EXISTS (SELECT 1 FROM public.chat_messages lr WHERE lr.id = me.last_read_message_id
                        AND (m2.created_at > lr.created_at
                          OR (m2.created_at = lr.created_at AND m2.id > lr.id))))
            ) AS unread_count
        FROM public.chat_channels c
        LEFT JOIN public.branches b ON b.id = c.branch_id
        LEFT JOIN public.chat_channel_members me ON me.channel_id = c.id AND me.user_id = v_user_id
        LEFT JOIN LATERAL (
            SELECT m.* FROM public.chat_messages m
            WHERE m.channel_id = c.id AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC, m.id DESC LIMIT 1
        ) lm ON TRUE
        LEFT JOIN public.profiles sp ON sp.id = lm.sender_id
        WHERE c.company_id = v_company AND c.archived_at IS NULL
          AND public.fn_can_access_chat_channel(c.id, v_user_id)
        ORDER BY c.updated_at DESC
    ) t;
    RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_get_channels_with_meta(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_send_chat_message(UUID, TEXT, TEXT, JSONB, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_mark_channel_read(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_execute_chat_action(UUID, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.rpc_get_or_create_direct_channel(UUID, UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.rpc_get_channels_with_meta(UUID) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_send_chat_message(UUID, TEXT, TEXT, JSONB, UUID, TEXT) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_mark_channel_read(UUID, UUID) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_execute_chat_action(UUID, TEXT, TEXT) FROM anon, PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_get_or_create_direct_channel(UUID, UUID) FROM anon, PUBLIC;

NOTIFY pgrst, 'reload schema';

COMMIT;


