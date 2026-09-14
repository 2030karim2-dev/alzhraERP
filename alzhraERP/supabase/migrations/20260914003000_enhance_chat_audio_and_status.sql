-- ============================================================================
-- Migration: Enhance Chat System with Audio Messages & Pinned Messages
-- Description:
--   1. Expands chat_messages_type_check to include 'audio' for voice notes.
--   2. Adds pinned_at and pinned_by columns for pinned messages support.
--   3. Adds index on pinned messages per channel.
-- ============================================================================

DO $$
BEGIN
    -- 1. Update message_type check constraint to include 'audio'
    ALTER TABLE public.chat_messages DROP CONSTRAINT IF EXISTS chat_messages_type_check;
    ALTER TABLE public.chat_messages ADD CONSTRAINT chat_messages_type_check 
        CHECK (message_type IN ('text', 'image', 'file', 'audio', 'entity_card', 'system', 'action_request'));

    -- 2. Add pinned_at and pinned_by columns if they do not exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'chat_messages' 
          AND column_name = 'pinned_at'
    ) THEN
        ALTER TABLE public.chat_messages ADD COLUMN pinned_at TIMESTAMPTZ DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'chat_messages' 
          AND column_name = 'pinned_by'
    ) THEN
        ALTER TABLE public.chat_messages ADD COLUMN pinned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT NULL;
    END IF;
END $$;

-- 3. Index for pinned messages lookup
CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned 
    ON public.chat_messages(channel_id, pinned_at DESC) 
    WHERE pinned_at IS NOT NULL;
