import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import { parseError } from '../../../core/utils/errorUtils';
import { buildOrValue } from '../../../core/utils/postgrestFilter';
import type { Database } from '../../../core/database.types';
import type { ChatMessage, SendMessagePayload, MessageType } from '../types';

interface MessageRawRow {
  id: string;
  channel_id: string;
  sender_id: string;
  message_type: string;
  content: string;
  metadata: Database['public']['Tables']['chat_messages']['Row']['metadata'];
  reply_to_id: string | null;
  client_message_id: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  pinned_at?: string | null;
  pinned_by?: string | null;
  profiles: { full_name: string; avatar_url: string | null } | null;
  reply_to_message: {
    id: string;
    content: string;
    sender_id: string;
    profiles: { full_name: string } | null;
  } | null;
  chat_message_attachments: Array<Database['public']['Tables']['chat_message_attachments']['Row']>;
  chat_message_reactions: Array<{
    id: string;
    message_id: string;
    user_id: string;
    emoji: string;
    created_at: string;
    profiles: { full_name: string } | null;
  }>;
}

export const messageService = {
  /**
   * Fetch messages for a specific channel with cursor pagination.
   */
  getMessages: async (
    channelId: string,
    limit = 40,
    beforeTimestamp?: string,
    beforeId?: string
  ): Promise<ChatMessage[]> => {
    try {
      const safeLimit = Math.min(Math.max(limit, 1), 100);
      const query = supabase
        .from('chat_messages')
        .select(
          `
          id,
          channel_id,
          sender_id,
          message_type,
          content,
          metadata,
          reply_to_id,
          client_message_id,
          created_at,
          edited_at,
          deleted_at,
          pinned_at,
          pinned_by,
          reply_to_message:reply_to_id (
            id,
            content,
            sender_id,
            profiles:sender_id (
              full_name
            )
          ),
          profiles:sender_id (
            full_name,
            avatar_url
          ),
          chat_message_attachments (
            id,
            message_id,
            company_id,
            storage_path,
            file_name,
            mime_type,
            file_size,
            uploaded_by,
            created_at
          ),
          chat_message_reactions (
            id,
            message_id,
            user_id,
            emoji,
            created_at,
            profiles:user_id (
              full_name
            )
          )
        `
        )
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(safeLimit);

      if (beforeTimestamp) {
        query.lt('created_at', beforeTimestamp);
      } else if (beforeId) {
        const { data: anchor } = await supabase
          .from('chat_messages')
          .select('created_at')
          .eq('id', beforeId)
          .maybeSingle();
        const anchorCreatedAt = anchor?.created_at;
        if (anchorCreatedAt) {
          query.or(
            `created_at.lt.${buildOrValue(anchorCreatedAt)},and(created_at.eq.${buildOrValue(anchorCreatedAt)},id.lt.${buildOrValue(beforeId)})`
          );
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data) return [];

      const rawMessages = data as unknown as MessageRawRow[];
      const formatted: ChatMessage[] = rawMessages.map(msg => ({
        id: msg.id,
        channel_id: msg.channel_id,
        sender_id: msg.sender_id,
        message_type: msg.message_type as MessageType,
        content: msg.content,
        metadata: (msg.metadata as unknown as ChatMessage['metadata']) ?? {},
        reply_to_id: msg.reply_to_id,
        pinned_at: msg.pinned_at || null,
        pinned_by: msg.pinned_by || null,
        reply_to_message: msg.reply_to_message
          ? {
              id: msg.reply_to_message.id,
              channel_id: msg.channel_id,
              sender_id: msg.reply_to_message.sender_id,
              message_type: 'text',
              content: msg.reply_to_message.content,
              metadata: {},
              created_at: '',
              sender_name: msg.reply_to_message.profiles?.full_name || 'موظف',
            }
          : null,
        client_message_id: msg.client_message_id,
        created_at: msg.created_at,
        edited_at: msg.edited_at,
        deleted_at: msg.deleted_at,
        sender_name: msg.profiles?.full_name || 'موظف',
        sender_avatar: msg.profiles?.avatar_url || null,
        attachments: msg.chat_message_attachments,
        reactions: msg.chat_message_reactions.map(r => ({
          id: r.id,
          message_id: r.message_id,
          user_id: r.user_id,
          emoji: r.emoji,
          created_at: r.created_at,
          user_name: r.profiles?.full_name || '',
        })),
      }));

      return formatted.reverse();
    } catch (err) {
      logger.error('MessageService', 'Error fetching messages', err);
      throw parseError(err);
    }
  },

  /**
   * Send a chat message securely via RPC
   */
  sendMessage: async (payload: SendMessagePayload): Promise<ChatMessage | null> => {
    try {
      const clientMessageId =
        payload.client_message_id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const { data, error } = await (supabase.rpc as any)('rpc_send_chat_message', {
        p_channel_id: payload.channel_id,
        p_content: payload.content || '',
        p_message_type: payload.message_type || 'text',
        p_metadata: payload.metadata || {},
        p_reply_to_id: payload.reply_to_id || null,
        p_client_message_id: clientMessageId,
      });

      if (error) throw error;
      if (!data) return null;
      return data;
    } catch (err) {
      logger.error('MessageService', 'Error sending chat message', err);
      throw err;
    }
  },

  /**
   * Toggle pinned status on a message
   */
  pinMessage: async (messageId: string, userId: string, isPinned: boolean): Promise<void> => {
    try {
      const { error } = await (supabase.from('chat_messages').update as any)({
        pinned_at: isPinned ? new Date().toISOString() : null,
        pinned_by: isPinned ? userId : null,
      }).eq('id', messageId);

      if (error) throw error;
    } catch (err) {
      logger.error('MessageService', 'Error pinning message', err);
      throw err;
    }
  },

  /**
   * Soft-delete a message
   */
  deleteMessage: async (messageId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;
    } catch (err) {
      logger.error('MessageService', 'Error deleting message', err);
      throw err;
    }
  },

  /**
   * Fetch all pinned messages for a channel
   */
  getPinnedMessages: async (channelId: string): Promise<ChatMessage[]> => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select(
          'id, channel_id, content, sender_id, message_type, created_at, pinned_at, metadata, profiles:sender_id(full_name)'
        )
        .eq('channel_id', channelId)
        .not('pinned_at', 'is', null)
        .is('deleted_at', null)
        .order('pinned_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];

      return (data as any[]).map(m => ({
        id: m.id,
        channel_id: m.channel_id,
        sender_id: m.sender_id,
        message_type: m.message_type,
        content: m.content,
        metadata: m.metadata || {},
        created_at: m.created_at,
        pinned_at: m.pinned_at,
        sender_name: m.profiles?.full_name || 'موظف',
      }));
    } catch (err) {
      logger.error('MessageService', 'Error fetching pinned messages', err);
      return [];
    }
  },
};
