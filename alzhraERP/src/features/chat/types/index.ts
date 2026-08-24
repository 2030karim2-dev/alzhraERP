export type ChannelType = 'direct' | 'group' | 'branch' | 'department' | 'topic' | 'contextual';

export type MessageType = 'text' | 'image' | 'file' | 'entity_card' | 'system' | 'action_request';

export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface ChatChannel {
  id: string;
  company_id: string;
  type: ChannelType;
  name: string;
  description?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
  is_private: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  // Computed / Joined fields
  unread_count?: number;
  last_message?: ChatMessage | null;
  members_count?: number;
  direct_user?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
    branch_name?: string | null;
  } | null;
}

export interface ChatChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  last_read_message_id?: string | null;
  muted_until?: string | null;
  joined_at: string;
  left_at?: string | null;
  // Joined user profile
  profile?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  };
}

export interface EntityCardMetadata {
  entity_type: 'product' | 'vin' | 'invoice' | 'transfer' | 'party' | 'custom';
  entity_id: string;
  title: string;
  subtitle?: string;
  details?: Record<string, unknown>;
  badge?: {
    text: string;
    variant: 'success' | 'warning' | 'info' | 'danger' | 'neutral';
  };
  image_url?: string;
  route_path?: string;
  // Action details if message_type === 'action_request'
  action_type?: 'stock_transfer_approval' | 'discount_approval' | 'stock_reservation';
  action_status?: ActionStatus;
  action_by?: string;
  action_at?: string;
  action_notes?: string;
  target_user_id?: string;
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  company_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by?: string | null;
  created_at: string;
  public_url?: string;
}

export interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user_name?: string;
}

export interface ChatMessage {
  id: string;
  channel_id: string;
  sender_id: string;
  message_type: MessageType;
  content: string;
  metadata: EntityCardMetadata | Record<string, unknown>;
  reply_to_id?: string | null;
  client_message_id?: string | null;
  created_at: string;
  edited_at?: string | null;
  deleted_at?: string | null;
  // Joined fields
  sender_name?: string;
  sender_avatar?: string | null;
  sender_branch?: string | null;
  attachments?: ChatAttachment[];
  reactions?: ChatReaction[];
  reply_to_message?: {
    id: string;
    content: string;
    sender_name?: string;
  } | null;
  is_optimistic?: boolean;
}

export interface SendMessagePayload {
  channel_id: string;
  content: string;
  message_type?: MessageType;
  metadata?: EntityCardMetadata | Record<string, unknown>;
  reply_to_id?: string | null;
  client_message_id?: string;
  attachments?: Array<{
    file: File;
    storage_path: string;
    file_name: string;
    mime_type: string;
    file_size: number;
  }>;
}

export interface UserPresence {
  user_id: string;
  full_name: string;
  avatar_url?: string | null;
  status: 'online' | 'away' | 'busy' | 'offline';
  branch_id?: string | null;
  branch_name?: string | null;
  last_seen_at: string;
  typing_in_channel_id?: string | null;
}
