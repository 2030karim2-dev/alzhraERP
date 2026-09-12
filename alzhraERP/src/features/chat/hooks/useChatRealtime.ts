import { useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../../auth/store';
import { useChatNotifications } from './useChatNotifications';
import { logger } from '../../../core/utils/logger';
import type { ChatMessage } from '../types';

interface ChatMessageRow {
  id: string;
  channel_id: string;
  sender_id: string;
  message_type: ChatMessage['message_type'];
  content: string;
  metadata: ChatMessage['metadata'];
  reply_to_id: string | null;
  client_message_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

const getInsertRow = (payload: any) => payload.new as ChatMessageRow | null;
const getUpdateRow = (payload: any) => payload.new as Partial<ChatMessageRow> & { id: string };

// In-memory profile cache for fast realtime rendering
const senderProfileCache = new Map<string, { full_name: string; avatar_url: string | null }>();

// Shared singleton guard: useChatRealtime is mounted by both ChatHubPage and
// FloatingChatWidget. Without this, two channels -> duplicate messages + double beep.
let activeRealtimeKey: string | null = null;
let activeRealtimeRefCount = 0;

export const useChatRealtime = () => {
  const { user } = useAuthStore();
  const {
    addIncomingMessage,
    updateMessageInState,
    fetchChannels,
    activeChannelId,
    fetchMessages,
  } = useChatStore();
  const { notifyIncomingMessage } = useChatNotifications();

  const companyId = user?.company_id;
  const userId = user?.id;

  useEffect(() => {
    if (!companyId || !userId) return;

    const key = `${companyId}:${userId}`;
    if (activeRealtimeKey === key) {
      activeRealtimeRefCount += 1;
      return () => {
        activeRealtimeRefCount = Math.max(0, activeRealtimeRefCount - 1);
      };
    }
    activeRealtimeKey = key;
    activeRealtimeRefCount = 1;

    let hasSubscribedBefore = false;
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
        async payload => {
          const row = getInsertRow(payload);
          if (!row) return;

          // Fetch sender profile with in-memory caching
          let senderName = 'موظف';
          let senderAvatar: string | null = null;

          if (senderProfileCache.has(row.sender_id)) {
            const cached = senderProfileCache.get(row.sender_id)!;
            senderName = cached.full_name;
            senderAvatar = cached.avatar_url;
          } else {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, avatar_url')
                .eq('id', row.sender_id)
                .single();

              if (profile) {
                senderName = profile.full_name || 'موظف';
                senderAvatar = profile.avatar_url;
                senderProfileCache.set(row.sender_id, {
                  full_name: senderName,
                  avatar_url: senderAvatar,
                });
              }
            } catch {
              // Fallback to default
            }
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

          // Unified beep + background desktop notification (with cooldown)
          if (row.sender_id !== userId) {
            notifyIncomingMessage(senderName, row.content || '', row.channel_id);
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
        payload => {
          const row = getUpdateRow(payload);
          if (!row) return;
          const update: Partial<ChatMessage> = {};
          if (row.content !== undefined) update.content = row.content;
          if (row.metadata !== undefined) update.metadata = row.metadata;
          if (row.edited_at !== undefined) update.edited_at = row.edited_at;
          if (row.deleted_at !== undefined) update.deleted_at = row.deleted_at;
          updateMessageInState(row.id, update);
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
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          logger.debug('ChatRealtime', `Connected to chat realtime channel [${channelName}]`);
          // If reconnected after initial connection, resync channels & messages
          if (hasSubscribedBefore) {
            fetchChannels(companyId, userId);
            if (activeChannelId) {
              fetchMessages(activeChannelId);
            }
          }
          hasSubscribedBefore = true;
        }
      });

    return () => {
      activeRealtimeRefCount = Math.max(0, activeRealtimeRefCount - 1);
      if (activeRealtimeRefCount === 0) {
        activeRealtimeKey = null;
        supabase.removeChannel(channel);
      }
    };
  }, [
    companyId,
    userId,
    addIncomingMessage,
    updateMessageInState,
    fetchChannels,
    activeChannelId,
    fetchMessages,
    notifyIncomingMessage,
  ]);
};
