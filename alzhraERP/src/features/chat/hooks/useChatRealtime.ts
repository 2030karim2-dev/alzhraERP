import { useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../../auth/store';
import { useChatNotifications } from './useChatNotifications';
import { logger } from '../../../core/utils/logger';
import type { ChatMessage } from '../types';

export const useChatRealtime = () => {
  const { user } = useAuthStore();
  const { addIncomingMessage, updateMessageInState, fetchChannels } = useChatStore();
  const { playIncomingBeep } = useChatNotifications();

  const companyId = user?.company_id;
  const userId = user?.id;

  useEffect(() => {
    if (!companyId || !userId) return;

    const channelName = `chat-realtime-${companyId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        async (payload) => {
          const row = payload.new as any;
          if (!row) return;

          // Fetch sender profile for the new message
          let senderName = 'موظف';
          let senderAvatar = null;
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', row.sender_id)
              .single();

            if (profile) {
              senderName = profile.full_name || 'موظف';
              senderAvatar = profile.avatar_url;
            }
          } catch (e) {
            // Ignore profile fetch failure
          }

          const message: ChatMessage = {
            id: row.id,
            channel_id: row.channel_id,
            sender_id: row.sender_id,
            message_type: row.message_type,
            content: row.content,
            metadata: row.metadata || {},
            reply_to_id: row.reply_to_id,
            client_message_id: row.client_message_id,
            created_at: row.created_at,
            edited_at: row.edited_at,
            deleted_at: row.deleted_at,
            sender_name: senderName,
            sender_avatar: senderAvatar,
            reactions: [],
            attachments: [],
          };

          addIncomingMessage(message, userId);

          // Play chime if message from another user
          if (row.sender_id !== userId) {
            playIncomingBeep();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const row = payload.new as any;
          if (!row) return;
          updateMessageInState(row.id, {
            content: row.content,
            metadata: row.metadata,
            edited_at: row.edited_at,
            deleted_at: row.deleted_at,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channels',
        },
        () => {
          // Refresh channels list when new channels are created or updated
          fetchChannels(companyId, userId);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          logger.debug('ChatRealtime', `Connected to chat realtime channel [${channelName}]`);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [companyId, userId, addIncomingMessage, updateMessageInState, fetchChannels, playIncomingBeep]);
};
