import React, { useState } from 'react';
import { ArrowRight, Building2, Hash, Layers, Users, Search } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../../auth/store';
import { useChatPresence } from '../hooks/useChatPresence';
import { useChatSearch } from '../hooks/useChatSearch';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { ChatWallpaper } from './conversation/ChatWallpaper';
import { ChatSearchOverlay } from './conversation/ChatSearchOverlay';
import { PinnedMessageBanner } from './conversation/PinnedMessageBanner';

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
    pinMessage,
  } = useChatStore();

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const currentUserId = user?.id || '';
  const activeChannel = channels.find(c => c.id === activeChannelId);
  const messages = activeChannelId ? messagesByChannel[activeChannelId] || [] : [];
  const hasMore = activeChannelId ? !!hasMoreMessages[activeChannelId] : false;
  const currentTyping = activeChannelId ? typingUsers[activeChannelId] || [] : [];

  const { broadcastTyping } = useChatPresence(activeChannelId);

  // In-chat search hook
  const {
    searchTerm,
    setSearchTerm,
    currentMatchId,
    activeMatchIndex,
    totalMatches,
    goToNext,
    goToPrev,
    clearSearch,
  } = useChatSearch(messages);

  if (!activeChannel) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-[var(--app-text-secondary)]">
        <Hash size={40} className="mb-3 text-[var(--accent)] opacity-40" />
        <h3 className="text-base font-bold text-[var(--app-text)]">اختر محادثة للبدء</h3>
        <p className="mt-1 text-xs">
          تواصل مع زملائك في الفروع وشارك القطع وطلبات المناقلة لحظياً.
        </p>
      </div>
    );
  }

  const directUser = activeChannel.direct_user;
  const isDirectOnline = Boolean(directUser && presences[directUser.id]?.status === 'online');
  const isDirectTyping = currentTyping.length > 0;

  // Find latest pinned message in this channel if any
  const pinnedMessage = messages.find(m => Boolean(m.pinned_at)) || null;

  const handleJumpToMessage = (messageId: string) => {
    const el = document.getElementById(`msg-${messageId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleUnpin = (messageId: string) => {
    pinMessage(messageId, currentUserId, false);
  };

  return (
    <div className="flex h-full flex-1 flex-col bg-[var(--app-bg)]">
      {/* Top Channel Header (WhatsApp-grade) */}
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
                className="h-9 w-9 rounded-full border border-[var(--app-border)] object-cover"
              />
            ) : (
              <div className="bg-[var(--accent)]/10 flex h-9 w-9 items-center justify-center rounded-xl font-bold text-[var(--accent)]">
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
                <span className="py-0.2 rounded border border-[var(--app-border)] bg-[var(--app-bg)] px-1.5 text-[10px] font-semibold text-[var(--app-text-secondary)]">
                  {activeChannel.branch_name}
                </span>
              )}
            </div>

            <p className="text-[11px] text-[var(--app-text-secondary)]">
              {isDirectTyping ? (
                <span className="animate-pulse font-bold text-[var(--accent)]">يكتب الآن...</span>
              ) : activeChannel.type === 'direct' ? (
                isDirectOnline ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    متصل الآن
                  </span>
                ) : (
                  'غير متصل'
                )
              ) : (
                activeChannel.description || `${activeChannel.members_count || 1} عضو`
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[var(--app-text-secondary)]">
          {/* In-Chat Search Button */}
          <button
            type="button"
            onClick={() => {
              setIsSearchOpen(!isSearchOpen);
              if (isSearchOpen) clearSearch();
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
              isSearchOpen
                ? 'bg-[var(--accent)]/10 text-[var(--accent)]'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
            }`}
            title="بحث داخل المحادثة"
          >
            <Search size={16} />
          </button>

          {activeChannel.members_count && activeChannel.members_count > 1 && (
            <div className="flex items-center gap-1 rounded-lg bg-[var(--app-bg)] px-2.5 py-1 text-xs font-semibold">
              <Users size={14} />
              <span>{activeChannel.members_count}</span>
            </div>
          )}
        </div>
      </div>

      {/* In-Chat Search Bar Overlay */}
      <ChatSearchOverlay
        isOpen={isSearchOpen}
        searchTerm={searchTerm}
        activeMatchIndex={activeMatchIndex}
        totalMatches={totalMatches}
        onSearchChange={setSearchTerm}
        onNext={goToNext}
        onPrev={goToPrev}
        onClose={() => {
          setIsSearchOpen(false);
          clearSearch();
        }}
      />

      {/* Pinned Message Banner */}
      <PinnedMessageBanner
        pinnedMessage={pinnedMessage}
        onJumpToMessage={handleJumpToMessage}
        onUnpin={handleUnpin}
        canManage={true}
      />

      {/* Wallpaper Wrapped Messages List Area */}
      <ChatWallpaper>
        <MessageList
          messages={messages}
          currentUserId={currentUserId}
          isLoading={isLoadingMessages}
          isLoadingMore={isLoadingMoreMessages}
          hasMore={hasMore}
          typingUserNames={currentTyping}
          isDirectOnline={isDirectOnline}
          peerLastReadMessageId={activeChannel.peer_last_read_message_id}
          activeSearchMatchId={isSearchOpen ? currentMatchId : null}
          onLoadMore={() => fetchMessages(activeChannel.id, true)}
          onReply={msg => {
            setReplyingTo(msg);
          }}
        />
      </ChatWallpaper>

      {/* Composer Input Area */}
      <MessageComposer
        channelId={activeChannel.id}
        onTyping={isTyping => {
          broadcastTyping(isTyping);
        }}
      />
    </div>
  );
};
