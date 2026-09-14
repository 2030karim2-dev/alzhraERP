import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import { parseError } from '../../../core/utils/errorUtils';
import type { ChatChannel, ChatMessage, MessageType } from '../types';

export interface RpcChannelsMetaRow {
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
  branch_name: string | null;
  members_count: number | string | null;
  last_message_id: string | null;
  last_message_content: string | null;
  last_message_type: string | null;
  last_message_sender_id: string | null;
  last_message_created_at: string | null;
  last_message_sender_name: string | null;
  last_message_sender_avatar: string | null;
  unread_count: number | string | null;
}

interface DirectPeerData {
  id: string;
  full_name: string;
  avatar_url: string | null;
  last_read_message_id: string | null;
}

/**
 * Maps one rpc_get_channels_with_meta row to the ChatChannel shape.
 */
export function mapMetaRowToChannel(row: RpcChannelsMetaRow): ChatChannel {
  const lastMessage: ChatMessage | null = row.last_message_id
    ? {
        id: row.last_message_id,
        channel_id: row.id,
        sender_id: row.last_message_sender_id || '',
        message_type: (row.last_message_type as MessageType) || 'text',
        content: row.last_message_content || '',
        metadata: {},
        reply_to_id: null,
        created_at: row.last_message_created_at || row.updated_at,
        sender_name: row.last_message_sender_name || 'موظف',
        sender_avatar: row.last_message_sender_avatar ?? null,
      }
    : null;

  return {
    id: row.id,
    company_id: row.company_id,
    type: row.type as ChatChannel['type'],
    name: row.name,
    description: row.description,
    branch_id: row.branch_id,
    branch_name: row.branch_name,
    reference_type: row.reference_type,
    reference_id: row.reference_id,
    is_private: row.is_private,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
    archived_at: row.archived_at,
    unread_count: Number(row.unread_count) || 0,
    last_message: lastMessage,
    members_count: Number(row.members_count) || 0,
    direct_user: null,
    peer_last_read_message_id: null,
  };
}

/**
 * Resolve display names and read status for direct channels in one batched query.
 */
export async function fetchDirectPeers(
  channelIds: string[],
  currentUserId: string
): Promise<Record<string, DirectPeerData>> {
  if (channelIds.length === 0) return {};
  const { data, error } = await supabase
    .from('chat_channel_members')
    .select(
      'channel_id, user_id, last_read_message_id, profiles:user_id (id, full_name, avatar_url)'
    )
    .in('channel_id', channelIds)
    .neq('user_id', currentUserId);

  if (error || !data) return {};
  const peers: Record<string, DirectPeerData> = {};
  for (const row of data as unknown as Array<{
    channel_id: string;
    user_id: string;
    last_read_message_id: string | null;
    profiles: { id: string; full_name: string; avatar_url: string | null } | null;
  }>) {
    if (!peers[row.channel_id] && row.profiles) {
      peers[row.channel_id] = {
        id: row.user_id,
        full_name: row.profiles.full_name || 'موظف',
        avatar_url: row.profiles.avatar_url,
        last_read_message_id: row.last_read_message_id,
      };
    }
  }
  return peers;
}

export const channelService = {
  /**
   * Fetch all channels accessible to the user in this company.
   */
  getChannels: async (companyId: string, userId: string): Promise<ChatChannel[]> => {
    try {
      const { data, error } = await (supabase.rpc as any)('rpc_get_channels_with_meta', {
        p_company_id: companyId,
      });

      if (!error && Array.isArray(data)) {
        const channels = (data as unknown as RpcChannelsMetaRow[]).map(row =>
          mapMetaRowToChannel(row)
        );

        const directIds = channels.filter(c => c.type === 'direct').map(c => c.id);
        if (directIds.length > 0) {
          const peers = await fetchDirectPeers(directIds, userId);
          for (const ch of channels) {
            const peer = peers[ch.id];
            if (ch.type === 'direct' && peer) {
              ch.direct_user = {
                id: peer.id,
                full_name: peer.full_name,
                avatar_url: peer.avatar_url,
              };
              ch.name = peer.full_name;
              ch.peer_last_read_message_id = peer.last_read_message_id;
            }
          }
        }
        return channels;
      }

      if (error) {
        logger.error('ChannelService', 'rpc_get_channels_with_meta failed, using fallback', error);
      }
      return channelService.getChannelsLegacy(companyId, userId);
    } catch (err) {
      logger.error('ChannelService', 'Error fetching chat channels', err);
      throw parseError(err);
    }
  },

  /**
   * Legacy per-channel fetch fallback
   */
  getChannelsLegacy: async (companyId: string, userId: string): Promise<ChatChannel[]> => {
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

      return (data as any[]).map(ch => {
        const members = ch.chat_channel_members || [];
        const otherMember = members.find((m: any) => m.user_id !== userId);

        let directUser: ChatChannel['direct_user'] = null;
        let displayName = ch.name;
        let peerLastRead: string | null = null;

        if (ch.type === 'direct' && otherMember?.profiles) {
          directUser = {
            id: otherMember.user_id,
            full_name: otherMember.profiles.full_name || 'موظف',
            avatar_url: otherMember.profiles.avatar_url,
          };
          displayName = directUser.full_name;
          peerLastRead = otherMember.last_read_message_id || null;
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
          unread_count: 0,
          last_message: null,
          members_count: members.length,
          direct_user: directUser,
          peer_last_read_message_id: peerLastRead,
        };
      });
    } catch (err) {
      logger.error('ChannelService', 'Error fetching chat channels legacy', err);
      throw parseError(err);
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
      logger.error('ChannelService', 'Error marking channel read', err);
    }
  },

  /**
   * Create or find a direct 1-on-1 channel with an employee
   */
  getOrCreateDirectChannel: async (companyId: string, targetUserId: string): Promise<string> => {
    try {
      const data = await (supabase.rpc as any)('rpc_get_or_create_direct_channel', {
        p_company_id: companyId,
        p_target_user_id: targetUserId,
      });
      return String(data ?? '');
    } catch (err) {
      logger.error('ChannelService', 'Error creating direct channel', err);
      throw err;
    }
  },

  /**
   * Create or find a contextual channel linked to an ERP document
   */
  getOrCreateContextualChannel: async (
    companyId: string,
    referenceType: string,
    referenceId: string,
    channelName: string
  ): Promise<string> => {
    try {
      const data = await (supabase.rpc as any)('rpc_get_or_create_contextual_channel', {
        p_company_id: companyId,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_channel_name: channelName,
      });
      return String(data ?? '');
    } catch (err) {
      logger.error('ChannelService', 'Error creating contextual channel', err);
      throw err;
    }
  },

  /**
   * Create a new group or branch channel
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

      await supabase.from('chat_channel_members').insert({
        channel_id: newChannel.id,
        user_id: payload.userId,
        role: 'owner',
      });

      return newChannel.id;
    } catch (err) {
      logger.error('ChannelService', 'Error creating group channel', err);
      throw err;
    }
  },

  /**
   * Get list of company employees for new chats
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

      return (data as any[]).map(item => ({
        id: item.user_id,
        full_name: item.profiles?.full_name || 'موظف',
        avatar_url: item.profiles?.avatar_url || null,
        role: item.role,
        branch_name: item.branches?.name || null,
      }));
    } catch (err) {
      logger.error('ChannelService', 'Error fetching company employees', err);
      throw parseError(err);
    }
  },

  /**
   * Get company branches
   */
  getCompanyBranches: async (companyId: string): Promise<Array<{ id: string; name: string }>> => {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('company_id', companyId);

      if (error) throw error;
      return data || [];
    } catch (err) {
      logger.error('ChannelService', 'Error fetching company branches', err);
      throw parseError(err);
    }
  },
};
