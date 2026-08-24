import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ChatChannel,
  ChatMessage,
  SendMessagePayload,
  EntityCardMetadata,
  UserPresence,
} from '../types';
import { chatService } from '../services/chatService';
import { logger } from '../../../core/utils/logger';

interface ChatState {
  // Navigation & Active selection
  activeChannelId: string | null;
  activeFilter: 'all' | 'branch' | 'direct' | 'topic' | 'contextual';
  searchQuery: string;

  // Channels state
  channels: ChatChannel[];
  isLoadingChannels: boolean;
  
  // Messages state: Record<channelId, ChatMessage[]>
  messagesByChannel: Record<string, ChatMessage[]>;
  isLoadingMessages: boolean;
  isLoadingMoreMessages: boolean;
  hasMoreMessages: Record<string, boolean>;

  // Composer & UI state
  replyingTo: ChatMessage | null;
  activeEntityAttachment: EntityCardMetadata | null;
  isFloatingOpen: boolean;
  isFloatingMinimized: boolean;

  // Presence & Typing state
  presences: Record<string, UserPresence>;
  typingUsers: Record<string, string[]>; // channelId -> array of full_names

  // Actions
  setActiveChannel: (channelId: string | null) => void;
  setActiveFilter: (filter: 'all' | 'branch' | 'direct' | 'topic' | 'contextual') => void;
  setSearchQuery: (query: string) => void;
  setReplyingTo: (message: ChatMessage | null) => void;
  setActiveEntityAttachment: (entity: EntityCardMetadata | null) => void;
  setFloatingOpen: (open: boolean) => void;
  toggleFloatingMinimized: () => void;

  // Data Actions
  fetchChannels: (companyId: string, userId: string) => Promise<void>;
  fetchMessages: (channelId: string, loadMore?: boolean) => Promise<void>;
  sendMessage: (payload: SendMessagePayload, currentUserId: string, currentUserName?: string) => Promise<void>;
  addIncomingMessage: (message: ChatMessage, currentUserId: string) => void;
  updateMessageInState: (messageId: string, updates: Partial<ChatMessage>) => void;
  markChannelAsRead: (channelId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string, userId: string) => Promise<void>;
  executeAction: (messageId: string, action: 'approve' | 'reject' | 'cancel', notes?: string) => Promise<void>;
  
  // Presence actions
  setUserPresence: (presence: UserPresence) => void;
  setTyping: (channelId: string, userName: string, isTyping: boolean) => void;
  
  // Total computed unread count
  getTotalUnreadCount: () => number;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      activeChannelId: null,
      activeFilter: 'all',
      searchQuery: '',

      channels: [],
      isLoadingChannels: false,

      messagesByChannel: {},
      isLoadingMessages: false,
      isLoadingMoreMessages: false,
      hasMoreMessages: {},

      replyingTo: null,
      activeEntityAttachment: null,
      isFloatingOpen: false,
      isFloatingMinimized: false,

      presences: {},
      typingUsers: {},

      setActiveChannel: (channelId) => {
        set({ activeChannelId: channelId, replyingTo: null });
        if (channelId) {
          get().fetchMessages(channelId);
          get().markChannelAsRead(channelId);
        }
      },

      setActiveFilter: (filter) => set({ activeFilter: filter }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setReplyingTo: (message) => set({ replyingTo: message }),
      setActiveEntityAttachment: (entity) => set({ activeEntityAttachment: entity }),
      setFloatingOpen: (open) => set({ isFloatingOpen: open }),
      toggleFloatingMinimized: () => set((s) => ({ isFloatingMinimized: !s.isFloatingMinimized })),

      fetchChannels: async (companyId, userId) => {
        if (!companyId || !userId) return;
        set({ isLoadingChannels: true });
        try {
          const channels = await chatService.getChannels(companyId, userId);
          set({ channels, isLoadingChannels: false });
        } catch (err) {
          logger.error('ChatStore', 'Failed to fetch channels', err as Error);
          set({ isLoadingChannels: false });
        }
      },

      fetchMessages: async (channelId, loadMore = false) => {
        if (!channelId) return;

        const currentMessages = get().messagesByChannel[channelId] || [];
        if (loadMore) {
          if (get().isLoadingMoreMessages || !get().hasMoreMessages[channelId]) return;
          set({ isLoadingMoreMessages: true });
          const oldestMessage = currentMessages[0];
          const older = await chatService.getMessages(channelId, 30, oldestMessage?.created_at);
          set((state) => ({
            messagesByChannel: {
              ...state.messagesByChannel,
              [channelId]: [...older, ...(state.messagesByChannel[channelId] || [])],
            },
            hasMoreMessages: {
              ...state.hasMoreMessages,
              [channelId]: older.length >= 30,
            },
            isLoadingMoreMessages: false,
          }));
        } else {
          set({ isLoadingMessages: true });
          const messages = await chatService.getMessages(channelId, 40);
          set((state) => ({
            messagesByChannel: {
              ...state.messagesByChannel,
              [channelId]: messages,
            },
            hasMoreMessages: {
              ...state.hasMoreMessages,
              [channelId]: messages.length >= 40,
            },
            isLoadingMessages: false,
          }));
        }
      },

      sendMessage: async (payload, currentUserId, currentUserName) => {
        const tempId = `temp_${Date.now()}`;
        const optimisticMessage: ChatMessage = {
          id: tempId,
          channel_id: payload.channel_id,
          sender_id: currentUserId,
          message_type: payload.message_type || 'text',
          content: payload.content,
          metadata: payload.metadata || {},
          reply_to_id: payload.reply_to_id || null,
          created_at: new Date().toISOString(),
          sender_name: currentUserName || 'أنت',
          is_optimistic: true,
        };

        // 1. Optimistic Update
        set((state) => ({
          messagesByChannel: {
            ...state.messagesByChannel,
            [payload.channel_id]: [
              ...(state.messagesByChannel[payload.channel_id] || []),
              optimisticMessage,
            ],
          },
          replyingTo: null,
          activeEntityAttachment: null,
        }));

        try {
          // 2. Network Send
          const confirmed = await chatService.sendMessage(payload);
          if (confirmed) {
            set((state) => {
              const currentList = state.messagesByChannel[payload.channel_id] || [];
              const updatedList: ChatMessage[] = currentList.map((m) =>
                m.id === tempId ? { ...confirmed, is_optimistic: false, sender_name: currentUserName || 'أنت' } : m
              );
              return {
                messagesByChannel: {
                  ...state.messagesByChannel,
                  [payload.channel_id]: updatedList,
                },
              };
            });
          }
        } catch (err) {
          logger.error('ChatStore', 'Error sending message', err as Error);
          // Revert optimistic on error
          set((state) => ({
            messagesByChannel: {
              ...state.messagesByChannel,
              [payload.channel_id]: (state.messagesByChannel[payload.channel_id] || []).filter(
                (m) => m.id !== tempId
              ),
            },
          }));
          throw err;
        }
      },

      addIncomingMessage: (message, currentUserId) => {
        set((state) => {
          const channelList = state.messagesByChannel[message.channel_id] || [];
          // Avoid duplicate insertion
          if (channelList.some((m) => m.id === message.id || (m.client_message_id && m.client_message_id === message.client_message_id))) {
            return state;
          }

          const isCurrentActive = state.activeChannelId === message.channel_id;

          // Update channels list last message and unread count
          const updatedChannels = state.channels.map((ch) => {
            if (ch.id === message.channel_id) {
              const newUnread = !isCurrentActive && message.sender_id !== currentUserId
                ? (ch.unread_count || 0) + 1
                : ch.unread_count || 0;
              return {
                ...ch,
                last_message: message,
                unread_count: newUnread,
                updated_at: message.created_at,
              };
            }
            return ch;
          });

          // Sort channels so the most recently updated appears on top
          updatedChannels.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

          return {
            channels: updatedChannels,
            messagesByChannel: {
              ...state.messagesByChannel,
              [message.channel_id]: [...channelList, message],
            },
          };
        });

        // Automatically mark as read if currently open
        if (get().activeChannelId === message.channel_id && message.sender_id !== currentUserId) {
          get().markChannelAsRead(message.channel_id);
        }
      },

      updateMessageInState: (messageId, updates) => {
        set((state) => {
          const newMap = { ...state.messagesByChannel };
          for (const channelId in newMap) {
            newMap[channelId] = newMap[channelId].map((m) =>
              m.id === messageId ? { ...m, ...updates } : m
            );
          }
          return { messagesByChannel: newMap };
        });
      },

      markChannelAsRead: async (channelId) => {
        set((state) => ({
          channels: state.channels.map((ch) =>
            ch.id === channelId ? { ...ch, unread_count: 0 } : ch
          ),
        }));
        await chatService.markAsRead(channelId);
      },

      toggleReaction: async (messageId, emoji, userId) => {
        const activeChannel = get().activeChannelId;
        if (!activeChannel) return;
        const currentMessages = get().messagesByChannel[activeChannel] || [];
        const msg = currentMessages.find((m) => m.id === messageId);
        if (!msg) return;

        await chatService.toggleReaction(messageId, emoji, msg.reactions || [], userId);
      },

      executeAction: async (messageId, action, notes) => {
        const res = await chatService.executeAction(messageId, action, notes);
        if (res.success) {
          get().updateMessageInState(messageId, {
            metadata: {
              ...(get().messagesByChannel[get().activeChannelId || '']?.find((m) => m.id === messageId)?.metadata || {}),
              action_status: res.status,
              action_notes: notes,
            } as any,
          });
        }
      },

      setUserPresence: (presence) => {
        set((state) => ({
          presences: {
            ...state.presences,
            [presence.user_id]: presence,
          },
        }));
      },

      setTyping: (channelId, userName, isTyping) => {
        set((state) => {
          const currentTyping = state.typingUsers[channelId] || [];
          const updated = isTyping
            ? Array.from(new Set([...currentTyping, userName]))
            : currentTyping.filter((name) => name !== userName);
          return {
            typingUsers: {
              ...state.typingUsers,
              [channelId]: updated,
            },
          };
        });
      },

      getTotalUnreadCount: () => {
        return get().channels.reduce((sum, ch) => sum + (ch.unread_count || 0), 0);
      },
    }),
    {
      name: 'alzhra-chat-preferences',
      partialize: (state) => ({
        isFloatingMinimized: state.isFloatingMinimized,
        activeFilter: state.activeFilter,
      }),
    }
  )
);
