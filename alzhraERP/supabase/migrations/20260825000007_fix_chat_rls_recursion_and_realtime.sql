-- Migration: 20260825000007_fix_chat_rls_recursion_and_realtime.sql
-- Description: Fix RLS recursion on chat_channels, allow creators immediate read, expand channel types, and ensure Realtime publication.

-- 1. Expand chat_channels type check constraint
ALTER TABLE public.chat_channels
  DROP CONSTRAINT IF EXISTS chat_channels_type_check,
  ADD CONSTRAINT chat_channels_type_check
  CHECK (type IN ('direct', 'group', 'branch', 'department', 'topic', 'contextual', 'general', 'announcement'));

-- 2. Update fn_can_access_chat_channel function to avoid recursion and grant creator access
CREATE OR REPLACE FUNCTION public.fn_can_access_chat_channel(p_channel_id uuid, p_user_id uuid)
RETURNS boolean
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

    -- Fetch channel details directly
    SELECT id, company_id, type, branch_id, is_private, created_by
    INTO v_channel
    FROM public.chat_channels
    WHERE id = p_channel_id;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Channel creator always has access
    IF v_channel.created_by = p_user_id THEN
        RETURN TRUE;
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

    -- Owners, Admins, and Company Admins have universal access across the company
    IF v_user_role.role IN ('owner', 'admin', 'company_admin', 'manager') THEN
        RETURN TRUE;
    END IF;

    -- Check explicit membership
    IF EXISTS (
        SELECT 1 FROM public.chat_channel_members
        WHERE channel_id = p_channel_id AND user_id = p_user_id AND left_at IS NULL
    ) THEN
        RETURN TRUE;
    END IF;

    -- Public channels (not private) accessible to company staff
    IF NOT v_channel.is_private THEN
        IF v_channel.type = 'branch' AND v_channel.branch_id IS NOT NULL THEN
            IF v_user_role.branch_id IS NULL OR v_channel.branch_id = v_user_role.branch_id THEN
                RETURN TRUE;
            ELSE
                RETURN FALSE;
            END IF;
        END IF;
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$function$;

-- 3. Robust RLS Policies on chat_channels
DROP POLICY IF EXISTS "chat_channels_select" ON public.chat_channels;
CREATE POLICY "chat_channels_select" ON public.chat_channels
FOR SELECT TO authenticated
USING (
  company_id IN (SELECT get_auth_companies())
  AND (
    created_by = auth.uid()
    OR is_private = false
    OR fn_can_access_chat_channel(id, auth.uid())
  )
);

DROP POLICY IF EXISTS "chat_channels_insert" ON public.chat_channels;
CREATE POLICY "chat_channels_insert" ON public.chat_channels
FOR INSERT TO authenticated
WITH CHECK (
  company_id IN (SELECT get_auth_companies())
  AND (created_by = auth.uid() OR created_by IS NULL)
);

DROP POLICY IF EXISTS "chat_channels_update" ON public.chat_channels;
CREATE POLICY "chat_channels_update" ON public.chat_channels
FOR UPDATE TO authenticated
USING (
  company_id IN (SELECT get_auth_companies())
  AND (created_by = auth.uid() OR user_is_admin_or_manager(company_id))
);

-- 4. Robust RLS Policies on chat_channel_members
DROP POLICY IF EXISTS "chat_channel_members_select" ON public.chat_channel_members;
CREATE POLICY "chat_channel_members_select" ON public.chat_channel_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.chat_channels c
    WHERE c.id = chat_channel_members.channel_id
    AND c.company_id IN (SELECT get_auth_companies())
    AND (
      c.created_by = auth.uid()
      OR c.is_private = false
      OR fn_can_access_chat_channel(c.id, auth.uid())
    )
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
  )
);

-- 5. Realtime Publication & Replica Identity
ALTER TABLE public.chat_channels REPLICA IDENTITY FULL;
ALTER TABLE public.chat_channel_members REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_message_attachments REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_channels') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channels;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_channel_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_channel_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_message_reactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_reactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_message_attachments') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message_attachments;
  END IF;
END;
$$;

-- 6. Reload Schema Cache
NOTIFY pgrst, 'reload schema';
