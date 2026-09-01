import React, { useEffect, useRef } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import type { ChatMessage } from '../types';
import { MessageItem } from './MessageItem';

interface Props {
  messages: ChatMessage[];
  currentUserId: string;
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  typingUserNames: string[];
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
  onLoadMore,
  onReply,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef<number>(0);

  // Auto-scroll on initial load and new messages
  useEffect(() => {
    if (!isLoadingMore) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isLoadingMore]);

  // Maintain scroll position when older messages are prepended
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop } = containerRef.current;

    if (scrollTop === 0 && hasMore && !isLoadingMore) {
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
        <p className="mt-1 text-xs">ابدأ المحادثة الآن أو شارك بطاقة قطعة غيار / طلب مناقلة.</p>
      </div>
    );
  }

  // Format date helper for group separators
  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'اليوم';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'أمس';
    }
    return date.toLocaleDateString('ar-SA-u-nu-latn', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="scrollbar-thin scrollbar-thumb-[var(--app-border)] flex-1 overflow-y-auto p-4"
    >
      {/* Loading older messages indicator */}
      {isLoadingMore && (
        <div className="flex justify-center py-2">
          <Loader2 size={18} className="animate-spin text-[var(--accent)]" />
        </div>
      )}

      {/* Messages List with date groups */}
      {messages.map((message, index) => {
        const currentDate = new Date(message.created_at).toDateString();
        const prevDate = index > 0 ? new Date(messages[index - 1].created_at).toDateString() : null;
        const showDateSeparator = currentDate !== prevDate;

        return (
          <React.Fragment key={message.id}>
            {showDateSeparator && (
              <div className="my-4 flex items-center justify-center">
                <span className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-0.5 text-[10px] font-semibold text-[var(--app-text-secondary)] shadow-xs">
                  {formatDateSeparator(message.created_at)}
                </span>
              </div>
            )}
            <MessageItem
              message={message}
              isOwn={message.sender_id === currentUserId}
              currentUserId={currentUserId}
              onReply={onReply}
            />
          </React.Fragment>
        );
      })}

      {/* Typing Indicator */}
      {typingUserNames.length > 0 && (
        <div className="my-2 flex items-center gap-2 ps-2 text-xs italic text-[var(--app-text-secondary)]">
          <div className="flex gap-1">
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
