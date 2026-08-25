import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import type {
  ChatChannel,
  ChatMessage,
  SendMessagePayload,
  ChatReaction,
  ActionStatus,
} from '../types';

export const chatService = {
  /**
   * Fetch all channels accessible to the current user in this company
   */
  getChannels: async (companyId: string, userId: string): Promise<ChatChannel[]> => {
    try {
      const { data: channels, error } = await (supabase as any)
        .from('chat_channels')
        .select(`
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
        `)
        .eq('company_id', companyId)
        .is('archived_at', null)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      if (!channels) return [];

      // Process channels and compute metadata
      const formatted: ChatChannel[] = await Promise.all(
        channels.map(async (ch: any) => {
          const members = ch.chat_channel_members || [];
          const currentMember = members.find((m: any) => m.user_id === userId);
          const otherMember = members.find((m: any) => m.user_id !== userId);

          // Get unread count and last message
          let unreadCount = 0;
          let lastMessage: ChatMessage | null = null;

          const { data: latestMsgs } = await (supabase as any)
            .from('chat_messages')
            .select(`
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
            `)
            .eq('channel_id', ch.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (latestMsgs && latestMsgs.length > 0) {
            const msg = latestMsgs[0];
            lastMessage = {
              id: msg.id,
              channel_id: msg.channel_id,
              sender_id: msg.sender_id,
              message_type: msg.message_type as any,
              content: msg.content,
              metadata: msg.metadata as any,
              reply_to_id: msg.reply_to_id,
              created_at: msg.created_at,
              sender_name: (msg.profiles as any)?.full_name || 'موظف',
              sender_avatar: (msg.profiles as any)?.avatar_url,
            };

            // Calculate unread
            if (currentMember?.last_read_message_id !== lastMessage.id && lastMessage.sender_id !== userId) {
              const { count } = await (supabase as any)
                .from('chat_messages')
                .select('id', { count: 'exact', head: true })
                .eq('channel_id', ch.id)
                .neq('sender_id', userId);

              unreadCount = count || 1;
            }
          }

          let directUser = null;
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
            type: ch.type,
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
      let query = (supabase as any)
        .from('chat_messages')
        .select(`
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
        `)
        .eq('channel_id', channelId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (beforeTimestamp) {
        query = query.lt('created_at', beforeTimestamp);
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data) return [];

      const formatted: ChatMessage[] = data.map((msg: any) => ({
        id: msg.id,
        channel_id: msg.channel_id,
        sender_id: msg.sender_id,
        message_type: msg.message_type,
        content: msg.content,
        metadata: msg.metadata || {},
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
          : undefined,
        client_message_id: msg.client_message_id,
        created_at: msg.created_at,
        edited_at: msg.edited_at,
        deleted_at: msg.deleted_at,
        sender_name: msg.profiles?.full_name || 'موظف',
        sender_avatar: msg.profiles?.avatar_url || null,
        attachments: msg.chat_message_attachments || [],
        reactions: (msg.chat_message_reactions || []).map((r: any) => ({
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
      const clientMessageId = payload.client_message_id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const { data, error } = await (supabase.rpc as any)('rpc_send_chat_message', {
        p_channel_id: payload.channel_id,
        p_content: payload.content || '',
        p_message_type: payload.message_type || 'text',
        p_metadata: payload.metadata || {},
        p_reply_to_id: payload.reply_to_id || null,
        p_client_message_id: clientMessageId,
      });

      if (error) throw error;
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
  ): Promise<any> => {
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

      const { data, error: dbError } = await (supabase as any)
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
  toggleReaction: async (messageId: string, emoji: string, currentReactions: ChatReaction[], userId: string): Promise<void> => {
    try {
      const existing = currentReactions.find((r) => r.user_id === userId && r.emoji === emoji);
      if (existing) {
        await (supabase as any).from('chat_message_reactions').delete().eq('id', existing.id);
      } else {
        await (supabase as any).from('chat_message_reactions').insert({
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
      await (supabase.rpc as any)('rpc_mark_channel_read', {
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
      const { data, error } = await (supabase.rpc as any)('rpc_execute_chat_action', {
        p_message_id: messageId,
        p_action: action,
        p_notes: notes || null,
      });

      if (error) throw error;
      return data as { success: boolean; status: ActionStatus; message: string };
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
      const { data, error } = await (supabase.rpc as any)('rpc_get_or_create_direct_channel', {
        p_company_id: companyId,
        p_target_user_id: targetUserId,
      });

      if (error) throw error;
      return String(data);
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
      const { data, error } = await (supabase.rpc as any)('rpc_get_or_create_contextual_channel', {
        p_company_id: companyId,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_channel_name: channelName,
      });

      if (error) throw error;
      return String(data);
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
        } as never)
        .select('id')
        .single();

      if (error) throw error;

      // Join creator to the channel
      await supabase.from('chat_channel_members').insert({
        channel_id: (newChannel as any).id,
        user_id: payload.userId,
        role: 'owner',
      } as never);

      return (newChannel as any).id;
    } catch (err) {
      logger.error('ChatService', 'Error creating group channel', err as Error);
      throw err;
    }
  },

  /**
   * Get list of company employees for starting new chats
   */
  getCompanyEmployees: async (companyId: string): Promise<Array<{ id: string; full_name: string; avatar_url: string | null; role: string; branch_name: string | null }>> => {
    try {
      const { data, error } = await (supabase as any)
        .from('user_company_roles')
        .select(`
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
        `)
        .eq('company_id', companyId);

      if (error) throw error;
      if (!data) return [];

      return data.map((item: any) => ({
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
        .select(`
          id,
          name_ar,
          part_number,
          sku,
          brand,
          sale_price,
          product_stock (
            quantity
          )
        `)
        .eq('company_id', companyId)
        .or(`part_number.ilike.%${term}%,name_ar.ilike.%${term}%,sku.ilike.%${term}%`)
        .limit(10);

      if (error) throw error;
      return (data || []).map((p: any) => {
        const totalStock = Array.isArray(p.product_stock)
          ? p.product_stock.reduce((sum: number, s: any) => sum + (Number(s.quantity) || 0), 0)
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
        .select(`
          id,
          invoice_number,
          total_amount,
          created_at,
          status,
          type,
          party:party_id (
            name
          )
        `)
        .eq('company_id', companyId)
        .ilike('invoice_number', `%${term}%`)
        .limit(10);

      if (error) throw error;
      return (data || []).map((inv: any) => ({
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
        .select(`
          id,
          transfer_number,
          status,
          created_at,
          from_warehouse:warehouses!stock_transfers_from_warehouse_id_fkey (name_ar),
          to_warehouse:warehouses!stock_transfers_to_warehouse_id_fkey (name_ar)
        `)
        .eq('company_id', companyId)
        .ilike('transfer_number', `%${term}%`)
        .limit(10);

      if (error) throw error;
      return (data || []).map((tr: any) => ({
        id: tr.id,
        transfer_number: tr.transfer_number || 'TR',
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
