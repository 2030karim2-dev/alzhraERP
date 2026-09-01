import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import type { Database } from '../../../core/database.types';
import type {
  ChatChannel,
  ChatMessage,
  SendMessagePayload,
  ChatReaction,
  ActionStatus,
  MessageType,
} from '../types';

// The chat tables are NOT part of the generated Database types' relationship
// graph for embedded selects, so we keep explicit raw-row shapes here. The
// row-level access is fully tenant-scoped by RLS on the server; these types
// only describe what the queries select back into the service layer.
type ChannelRawRow = {
  id: string;
  company_id: string;
  type: string;
  name: string;
  description: string | null;
  branch_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  branches: { id: string; name: string } | null;
  chat_channel_members: Array<{
    user_id: string;
    last_read_message_id: string | null;
    profiles: { id: string; full_name: string; avatar_url: string | null } | null;
  }>;
};

type MessageRawRow = {
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
  profiles: { full_name: string; avatar_url: string | null } | null;
  reply_to_message: {
    id: string;
    content: string;
    sender_id: string;
    profiles: { full_name: string } | null;
  } | null;
  chat_message_attachments: Database['public']['Tables']['chat_message_attachments']['Row'][];
  chat_message_reactions: Array<{
    id: string;
    message_id: string;
    user_id: string;
    emoji: string;
    created_at: string;
    profiles: { full_name: string } | null;
  }>;
};

type EmployeeRoleRawRow = {
  user_id: string;
  role: string;
  branch_id: string | null;
  branches: { name: string } | null;
  profiles: { id: string; full_name: string; avatar_url: string | null } | null;
};

/**
 * Typed RPC wrappers. The chat RPCs exist on the server but are not yet part
 * of the generated `database.types.ts` (Functions section), so we declare the
 * exact argument/return shapes here instead of scattering `as any` casts.
 */
type RpcSendMessageArgs = {
  p_channel_id: string;
  p_content: string;
  p_message_type: string;
  p_metadata: unknown;
  p_reply_to_id: string | null;
  p_client_message_id: string;
};
type RpcSendMessageResult = { success: boolean; message_id?: string | null };

type RpcExecuteActionArgs = {
  p_message_id: string;
  p_action: 'approve' | 'reject' | 'cancel';
  p_notes: string | null;
};
type RpcExecuteActionResult = { success: boolean; status: ActionStatus; message: string };

type RpcCreateChannelArgs = {
  p_company_id: string;
  p_target_user_id?: string;
  p_reference_type?: string;
  p_reference_id?: string;
  p_channel_name?: string;
};

type RpcMarkReadArgs = {
  p_channel_id: string;
  p_last_message_id: string | null;
};

/** Call a named RPC with typed args; returns the raw result payload. */
async function callRpc<Args, Result>(fn: string, args: Args): Promise<Result | null> {
  const { data, error } = await (
    supabase.rpc as unknown as (
      name: string,
      args: Args
    ) => Promise<{ data: Result | null; error: { message: string } | null }>
  )(fn, args);
  if (error) throw error;
  return data;
}

export const chatService = {
  /**
   * Fetch all channels accessible to the current user in this company
   */
  getChannels: async (companyId: string, userId: string): Promise<ChatChannel[]> => {
    try {
      const { data, error } = await supabase
        .from('chat_channels')
        .select(
          `
          id,
          company_id,
          type,
          name,
          description,
          branch_id,
          reference_type,
          reference_id,
          is_private,
          created_by,
          created_at,
          updated_at,
          archived_at,
          branches (
            id,
            name
          ),
          chat_channel_members (
            user_id,
            last_read_message_id,
            profiles (
              id,
              full_name,
              avatar_url
            )
          )
        `
        )
        .eq('company_id', companyId)
        .is('archived_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (!data) return [];
      const channels = data as unknown as ChannelRawRow[];

      // Process channels and compute metadata
      const formatted: ChatChannel[] = await Promise.all(
        channels.map(async (ch: ChannelRawRow) => {
          const members = ch.chat_channel_members || [];
          const currentMember = members.find(m => m.user_id === userId);
          const otherMember = members.find(m => m.user_id !== userId);

          // Get unread count and last message
          let unreadCount = 0;
          let lastMessage: ChatMessage | null = null;

          const { data: latestMsgs } = await supabase
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
              created_at,
              profiles:sender_id (
                full_name,
                avatar_url
              )
            `
            )
            .eq('channel_id', ch.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (latestMsgs && latestMsgs.length > 0) {
            const msg = latestMsgs[0] as unknown as {
              id: string;
              channel_id: string;
              sender_id: string;
              message_type: string;
              content: string;
              metadata: unknown;
              reply_to_id: string | null;
              created_at: string;
              profiles?: { full_name?: string; avatar_url?: string | null } | null;
            };
            lastMessage = {
              id: msg.id,
              channel_id: msg.channel_id,
              sender_id: msg.sender_id,
              message_type: msg.message_type as MessageType,
              content: msg.content,
              metadata: (msg.metadata as ChatMessage['metadata']) ?? {},
              reply_to_id: msg.reply_to_id,
              created_at: msg.created_at,
              sender_name: msg.profiles?.full_name || 'موظف',
              sender_avatar: msg.profiles?.avatar_url ?? null,
            };

            // Calculate unread
            if (
              currentMember?.last_read_message_id !== (lastMessage?.id ?? '') &&
              lastMessage != null &&
              lastMessage.sender_id !== userId
            ) {
              const { count } = await supabase
                .from('chat_messages')
                .select('id', { count: 'exact', head: true })
                .eq('channel_id', ch.id)
                .neq('sender_id', userId);

              unreadCount = count || 1;
            }
          }

          let directUser: {
            id: string;
            full_name: string;
            avatar_url: string | null;
          } | null = null;
          let displayName = ch.name;

          if (ch.type === 'direct' && otherMember?.profiles) {
            directUser = {
              id: otherMember.user_id,
              full_name: otherMember.profiles.full_name || 'موظف',
              avatar_url: otherMember.profiles.avatar_url,
            };
            displayName = directUser.full_name;
          }

          return {
            id: ch.id,
            company_id: ch.company_id,
            type: ch.type as ChatChannel['type'],
            name: displayName,
            description: ch.description,
            branch_id: ch.branch_id,
            branch_name: ch.branches?.name || null,
            reference_type: ch.reference_type,
            reference_id: ch.reference_id,
            is_private: ch.is_private,
            created_by: ch.created_by,
            created_at: ch.created_at,
            updated_at: ch.updated_at,
            archived_at: ch.archived_at,
            unread_count: unreadCount,
            last_message: lastMessage,
            members_count: members.length,
            direct_user: directUser,
          };
        })
      );

      return formatted;
    } catch (err) {
      logger.error('ChatService', 'Error fetching chat channels', err as Error);
      return [];
    }
  },

  /**
   * Fetch messages for a specific channel with cursor pagination
   */
  getMessages: async (
    channelId: string,
    limit: number = 40,
    beforeTimestamp?: string
  ): Promise<ChatMessage[]> => {
    try {
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
        .limit(limit);

      if (beforeTimestamp) {
        query.lt('created_at', beforeTimestamp);
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

      // Return in chronological order (oldest first)
      return formatted.reverse();
    } catch (err) {
      logger.error('ChatService', 'Error fetching messages', err as Error);
      return [];
    }
  },

  /**
   * Send a chat message securely via RPC
   */
  sendMessage: async (payload: SendMessagePayload): Promise<ChatMessage | null> => {
    try {
      const clientMessageId =
        payload.client_message_id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const data = await callRpc<RpcSendMessageArgs, RpcSendMessageResult>(
        'rpc_send_chat_message',
        {
          p_channel_id: payload.channel_id,
          p_content: payload.content || '',
          p_message_type: payload.message_type || 'text',
          p_metadata: payload.metadata || {},
          p_reply_to_id: payload.reply_to_id || null,
          p_client_message_id: clientMessageId,
        }
      );

      if (!data) return null;
      return data as unknown as ChatMessage;
    } catch (err) {
      logger.error('ChatService', 'Error sending chat message', err as Error);
      throw err;
    }
  },

  /**
   * Upload an attachment to Supabase Storage and register metadata
   */
  uploadAttachment: async (
    companyId: string,
    messageId: string,
    file: File
  ): Promise<Database['public']['Tables']['chat_message_attachments']['Row'] | null> => {
    try {
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `${companyId}/${messageId}/${Date.now()}_${cleanFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data, error: dbError } = await supabase
        .from('chat_message_attachments')
        .insert({
          message_id: messageId,
          company_id: companyId,
          storage_path: storagePath,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (dbError) throw dbError;
      return data;
    } catch (err) {
      logger.error('ChatService', 'Error uploading attachment', err as Error);
      throw err;
    }
  },

  /**
   * Get temporary signed URL for private chat attachment
   */
  getAttachmentSignedUrl: async (storagePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(storagePath, 3600); // 1 hour validity

      if (error) throw error;
      return data?.signedUrl || null;
    } catch (err) {
      logger.error('ChatService', 'Error getting attachment signed URL', err as Error);
      return null;
    }
  },

  /**
   * Add / Toggle Reaction
   */
  toggleReaction: async (
    messageId: string,
    emoji: string,
    currentReactions: ChatReaction[],
    userId: string
  ): Promise<void> => {
    try {
      const existing = currentReactions.find(r => r.user_id === userId && r.emoji === emoji);
      if (existing) {
        await supabase.from('chat_message_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('chat_message_reactions').insert({
          message_id: messageId,
          emoji,
        });
      }
    } catch (err) {
      logger.error('ChatService', 'Error toggling reaction', err as Error);
    }
  },

  /**
   * Mark channel as read
   */
  markAsRead: async (channelId: string, lastMessageId?: string): Promise<void> => {
    try {
      await callRpc<RpcMarkReadArgs, null>('rpc_mark_channel_read', {
        p_channel_id: channelId,
        p_last_message_id: lastMessageId || null,
      });
    } catch (err) {
      logger.error('ChatService', 'Error marking channel read', err as Error);
    }
  },

  /**
   * Execute Action Request (e.g., Stock Transfer or Discount Approval)
   */
  executeAction: async (
    messageId: string,
    action: 'approve' | 'reject' | 'cancel',
    notes?: string
  ): Promise<{ success: boolean; status: ActionStatus; message: string }> => {
    try {
      const data = await callRpc<RpcExecuteActionArgs, RpcExecuteActionResult>(
        'rpc_execute_chat_action',
        {
          p_message_id: messageId,
          p_action: action,
          p_notes: notes || null,
        }
      );

      return data ?? { success: false, status: 'cancelled', message: 'لا يوجد رد من الخادم' };
    } catch (err) {
      logger.error('ChatService', 'Error executing chat action', err as Error);
      throw err;
    }
  },

  /**
   * Create or find a direct 1-on-1 channel with an employee
   */
  getOrCreateDirectChannel: async (companyId: string, targetUserId: string): Promise<string> => {
    try {
      const data = await callRpc<RpcCreateChannelArgs, string>('rpc_get_or_create_direct_channel', {
        p_company_id: companyId,
        p_target_user_id: targetUserId,
      });

      return String(data ?? '');
    } catch (err) {
      logger.error('ChatService', 'Error creating direct channel', err as Error);
      throw err;
    }
  },

  /**
   * Create or find a contextual channel linked to an ERP document/record
   */
  getOrCreateContextualChannel: async (
    companyId: string,
    referenceType: string,
    referenceId: string,
    channelName: string
  ): Promise<string> => {
    try {
      const data = await callRpc<RpcCreateChannelArgs, string>(
        'rpc_get_or_create_contextual_channel',
        {
          p_company_id: companyId,
          p_reference_type: referenceType,
          p_reference_id: referenceId,
          p_channel_name: channelName,
        }
      );

      return String(data ?? '');
    } catch (err) {
      logger.error('ChatService', 'Error creating contextual channel', err as Error);
      throw err;
    }
  },

  /**
   * Create a new group/topic channel and join the creator as owner
   */
  createGroupChannel: async (payload: {
    companyId: string;
    userId: string;
    name: string;
    description?: string | null;
    type: 'branch' | 'topic';
    branchId?: string | null;
  }): Promise<string> => {
    try {
      const { data: newChannel, error } = await supabase
        .from('chat_channels')
        .insert({
          company_id: payload.companyId,
          type: payload.type,
          name: payload.name,
          description: payload.description || null,
          branch_id: payload.type === 'branch' && payload.branchId ? payload.branchId : null,
          is_private: false,
          created_by: payload.userId,
        })
        .select('id')
        .single();

      if (error) throw error;
      if (!newChannel) throw new Error('تعذر إنشاء القناة');

      // Join creator to the channel
      await supabase.from('chat_channel_members').insert({
        channel_id: newChannel.id,
        user_id: payload.userId,
        role: 'owner',
      });

      return newChannel.id;
    } catch (err) {
      logger.error('ChatService', 'Error creating group channel', err as Error);
      throw err;
    }
  },

  /**
   * Get list of company employees for starting new chats
   */
  getCompanyEmployees: async (
    companyId: string
  ): Promise<
    Array<{
      id: string;
      full_name: string;
      avatar_url: string | null;
      role: string;
      branch_name: string | null;
    }>
  > => {
    try {
      const { data, error } = await supabase
        .from('user_company_roles')
        .select(
          `
          user_id,
          role,
          branch_id,
          branches (
            name
          ),
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `
        )
        .eq('company_id', companyId);

      if (error) throw error;
      if (!data) return [];

      const rawEmployees = data as unknown as EmployeeRoleRawRow[];
      return rawEmployees.map(item => ({
        id: item.user_id,
        full_name: item.profiles?.full_name || 'موظف',
        avatar_url: item.profiles?.avatar_url || null,
        role: item.role,
        branch_name: item.branches?.name || null,
      }));
    } catch (err) {
      logger.error('ChatService', 'Error fetching company employees', err as Error);
      return [];
    }
  },

  /**
   * Get list of company branches for chat filtering and group channel creation
   */
  getCompanyBranches: async (companyId: string): Promise<Array<{ id: string; name: string }>> => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('company_id', companyId);

      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string }>;
    } catch (err) {
      logger.error('ChatService', 'Error fetching company branches', err as Error);
      return [];
    }
  },

  /**
   * Search products for entity sharing in chat
   */
  searchProducts: async (companyId: string, search: string) => {
    try {
      const term = search.trim();
      if (!term) return [];

      const { data, error } = await supabase
        .from('products')
        .select(
          `
          id,
          name_ar,
          part_number,
          sku,
          brand,
          sale_price,
          product_stock (
            quantity
          )
        `
        )
        .eq('company_id', companyId)
        .or(`part_number.ilike.%${term}%,name_ar.ilike.%${term}%,sku.ilike.%${term}%`)
        .limit(10);

      if (error) throw error;
      return (data || []).map(p => {
        const totalStock = Array.isArray(p.product_stock)
          ? p.product_stock.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0)
          : 0;
        return {
          id: p.id,
          name: p.name_ar || p.part_number || p.sku || 'بدون اسم',
          part_number: p.part_number || p.sku || '',
          brand: p.brand || '',
          sale_price: Number(p.sale_price) || 0,
          total_stock: totalStock,
          stock: totalStock,
        };
      });
    } catch (err) {
      logger.error('ChatService', 'Error searching products for sharing', err as Error);
      return [];
    }
  },

  /**
   * Search invoices for entity sharing in chat
   */
  searchInvoices: async (companyId: string, search: string) => {
    try {
      const term = search.trim();
      if (!term) return [];

      const { data, error } = await supabase
        .from('invoices')
        .select(
          `
          id,
          invoice_number,
          total_amount,
          created_at,
          status,
          type,
          party:party_id (
            name
          )
        `
        )
        .eq('company_id', companyId)
        .ilike('invoice_number', `%${term}%`)
        .limit(10);

      if (error) throw error;
      return (data || []).map(inv => ({
        id: inv.id,
        invoice_number: inv.invoice_number || 'INV',
        total: Number(inv.total_amount) || 0,
        customer_name: inv.party?.name || (inv.type === 'purchase' ? 'مورد' : 'عميل نقدي'),
        status: inv.status,
        created_at: inv.created_at,
      }));
    } catch (err) {
      logger.error('ChatService', 'Error searching invoices for sharing', err as Error);
      return [];
    }
  },

  /**
   * Search stock transfers for entity sharing in chat
   */
  searchTransfers: async (companyId: string, search: string) => {
    try {
      const term = search.trim();
      if (!term) return [];

      const { data, error } = await supabase
        .from('stock_transfers')
        .select(
          `
          id,
          status,
          created_at,
          from_warehouse:from_warehouse_id (name_ar),
          to_warehouse:to_warehouse_id (name_ar)
        `
        )
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []).map(tr => ({
        id: tr.id,
        transfer_number: tr.id.slice(0, 8).toUpperCase(),
        status: tr.status,
        from_warehouse: tr.from_warehouse?.name_ar || 'مستودع المصدر',
        to_warehouse: tr.to_warehouse?.name_ar || 'مستودع الوجهة',
        created_at: tr.created_at,
      }));
    } catch (err) {
      logger.error('ChatService', 'Error searching transfers for sharing', err as Error);
      return [];
    }
  },

  /**
   * Search VIN analyses for entity sharing in chat
   */
  searchVins: async (companyId: string, search: string) => {
    try {
      const term = search.trim();
      if (!term) return [];

      const { data, error } = await supabase
        .from('vin_analyses')
        .select('id, vin, vehicle_id, decoded')
        .eq('company_id', companyId)
        .ilike('vin', `%${term}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('ChatService', 'Error searching VINs for sharing', err as Error);
      return [];
    }
  },
};
