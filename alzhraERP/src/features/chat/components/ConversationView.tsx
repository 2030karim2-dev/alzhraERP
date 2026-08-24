import React from 'react';
import { ArrowRight, Building2, Hash, Layers, Users } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../../auth/store';
import { useChatPresence } from '../hooks/useChatPresence';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';

interface Props {
  onBack?: () => void;
}

export const ConversationView: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuthStore();
  const {
    activeChannelId,
    channels,
    messagesByChannel,
    isLoadingMessages,
    isLoadingMoreMessages,
    hasMoreMessages,
    fetchMessages,
    setReplyingTo,
    presences,
    typingUsers,
  } = useChatStore();

  const currentUserId = user?.id || '';

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const messages = activeChannelId ? messagesByChannel[activeChannelId] || [] : [];
  const hasMore = activeChannelId ? !!hasMoreMessages[activeChannelId] : false;
  const currentTyping = activeChannelId ? typingUsers[activeChannelId] || [] : [];

  const { broadcastTyping } = useChatPresence(activeChannelId);

  if (!activeChannel) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[var(--app-text-secondary)]">
        <Hash size={40} className="mb-3 text-[var(--accent)] opacity-40" />
        <h3 className="text-base font-bold text-[var(--app-text)]">اختر محادثة للبدء</h3>
        <p className="mt-1 text-xs">تواصل مع زملائك في الفروع وشارك القطع وطلبات المناقلة لحظياً.</p>
      </div>
    );
  }

  const directUser = activeChannel.direct_user;
  const isDirectOnline = directUser && presences[directUser.id]?.status === 'online';

  return (
    <div className="flex h-full flex-1 flex-col bg-[var(--app-bg)]">
      {/* Top Channel Header */}
      <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-xs">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)] lg:hidden"
            >
              <ArrowRight size={18} />
            </button>
          )}

          <div className="relative">
            {activeChannel.type === 'direct' && directUser?.avatar_url ? (
              <img
                src={directUser.avatar_url}
                alt={activeChannel.name}
                className="h-9 w-9 rounded-full object-cover border border-[var(--app-border)]"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)] font-bold">
                {activeChannel.type === 'branch' ? (
                  <Building2 size={18} />
                ) : activeChannel.type === 'contextual' ? (
                  <Layers size={18} />
                ) : (
                  <Hash size={18} />
                )}
              </div>
            )}

            {activeChannel.type === 'direct' && (
              <span
                className={`absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--app-surface)] ${
                  isDirectOnline ? 'bg-emerald-500' : 'bg-zinc-400'
                }`}
              />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--app-text)]">{activeChannel.name}</h3>
              {activeChannel.branch_name && (
                <span className="rounded bg-[var(--app-bg)] px-1.5 py-0.2 text-[10px] font-semibold text-[var(--app-text-secondary)] border border-[var(--app-border)]">
                  {activeChannel.branch_name}
                </span>
              )}
            </div>

            <p className="text-[11px] text-[var(--app-text-secondary)]">
              {activeChannel.type === 'direct' ? (
                isDirectOnline ? (
                  <span className="text-emerald-600 font-semibold">متصل الآن</span>
                ) : (
                  'غير متصل'
                )
              ) : (
                activeChannel.description || `${activeChannel.members_count || 1} عضو`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[var(--app-text-secondary)]">
          {activeChannel.members_count && activeChannel.members_count > 1 && (
            <div className="flex items-center gap-1 rounded-lg bg-[var(--app-bg)] px-2.5 py-1 text-xs font-semibold">
              <Users size={14} />
              <span>{activeChannel.members_count}</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages List Area */}
      <MessageList
        messages={messages}
        currentUserId={currentUserId}
        isLoading={isLoadingMessages}
        isLoadingMore={isLoadingMoreMessages}
        hasMore={hasMore}
        typingUserNames={currentTyping}
        onLoadMore={() => fetchMessages(activeChannel.id, true)}
        onReply={(msg) => setReplyingTo(msg)}
      />

      {/* Composer Input Area */}
      <MessageComposer
        channelId={activeChannel.id}
        onTyping={(isTyping) => broadcastTyping(isTyping)}
      />
    </div>
  );
};
