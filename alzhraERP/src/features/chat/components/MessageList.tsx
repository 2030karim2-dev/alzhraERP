import React, { useEffect, useRef } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import type { ChatMessage } from '../types';
import { MessageItem } from './MessageItem';
import { DateSeparatorBadge } from './messages/DateSeparatorBadge';

interface Props {
  messages: ChatMessage[];
  currentUserId: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  typingUserNames: string[];
  isDirectOnline?: boolean | undefined;
  peerLastReadMessageId?: string | null | undefined;
  activeSearchMatchId?: string | null | undefined;
  onLoadMore: () => void;
  onReply: (message: ChatMessage) => void;
}

export const MessageList: React.FC<Props> = ({
  messages,
  currentUserId,
  isLoading,
  isLoadingMore,
  hasMore,
  typingUserNames,
  isDirectOnline,
  peerLastReadMessageId,
  activeSearchMatchId,
  onLoadMore,
  onReply,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);

  // Auto-scroll on initial load or new incoming messages
  const isNearBottomRef = useRef(true);
  useEffect(() => {
    if (isLoadingMore) return;
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isLoadingMore]);

  // Scroll to search match if active
  useEffect(() => {
    if (activeSearchMatchId) {
      const el = document.getElementById(`msg-${activeSearchMatchId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeSearchMatchId]);

  // Maintain scroll position when older messages are prepended
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;

    if (scrollTop <= 8 && hasMore && !isLoadingMore) {
      prevScrollHeightRef.current = containerRef.current.scrollHeight;
      onLoadMore();
    }
  };

  useEffect(() => {
    if (!isLoadingMore && prevScrollHeightRef.current && containerRef.current) {
      const diff = containerRef.current.scrollHeight - prevScrollHeightRef.current;
      containerRef.current.scrollTop = diff;
      prevScrollHeightRef.current = 0;
    }
  }, [messages, isLoadingMore]);

  if (isLoading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-[var(--app-text-secondary)]">
        <Loader2 size={28} className="animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-[var(--app-text-secondary)]">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--app-surface-hover)]">
          <MessageSquare size={28} className="text-[var(--accent)]" />
        </div>
        <h4 className="text-sm font-bold text-[var(--app-text)]">لا توجد رسائل سابقة</h4>
        <p className="mt-1 text-xs">
          ابدأ المحادثة الآن أو أرسل ملاحظة صوتية أو شارك بطاقة قطعة غيار.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="scrollbar-thin scrollbar-thumb-[var(--app-border)] relative flex-1 overflow-y-auto px-3 py-4 sm:px-5"
    >
      {/* Loading older messages indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
        </div>
      )}

      {/* Messages List with date groups */}
      {(() => {
        const peerLastReadIndex = peerLastReadMessageId
          ? messages.findIndex(m => m.id === peerLastReadMessageId)
          : -1;

        return messages.map((message, index) => {
          const currentDate = new Date(message.created_at).toDateString();
          const prevDate =
            index > 0 ? new Date(messages[index - 1].created_at).toDateString() : null;
          const showDateSeparator = currentDate !== prevDate;
          const isPeerRead = peerLastReadIndex >= 0 && index <= peerLastReadIndex;

          return (
            <React.Fragment key={message.id}>
              {showDateSeparator && <DateSeparatorBadge dateStr={message.created_at} />}
              <MessageItem
                message={message}
                isOwn={message.sender_id === currentUserId}
                currentUserId={currentUserId}
                isDirectOnline={isDirectOnline}
                peerLastReadMessageId={peerLastReadMessageId}
                isPeerRead={isPeerRead}
                isSearchMatch={message.id === activeSearchMatchId}
                onReply={onReply}
              />
            </React.Fragment>
          );
        });
      })()}

      {/* WhatsApp Typing Bubble Indicator */}
      {typingUserNames.length > 0 && (
        <div className="animate-in fade-in my-2 flex items-center gap-2 ps-2 text-xs italic text-[var(--app-text-secondary)] duration-200">
          <div className="shadow-2xs flex items-center gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1">
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)]"
              style={{ animationDelay: '0ms' }}
            />
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)]"
              style={{ animationDelay: '150ms' }}
            />
            <span
              className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--accent)]"
              style={{ animationDelay: '300ms' }}
            />
          </div>
          <span>{typingUserNames.join(', ')} يكتب الآن...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
};
