import React from 'react';
import { Pin, X } from 'lucide-react';
import type { ChatMessage } from '../../types';

interface Props {
  pinnedMessage: ChatMessage | null;
  onJumpToMessage?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
  canManage?: boolean;
}

export const PinnedMessageBanner: React.FC<Props> = ({
  pinnedMessage,
  onJumpToMessage,
  onUnpin,
  canManage,
}) => {
  if (!pinnedMessage) return null;

  return (
    <div className="shadow-2xs flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] px-3 py-1.5 text-xs">
      <div
        className="flex flex-1 cursor-pointer items-center gap-2 overflow-hidden"
        onClick={() => onJumpToMessage?.(pinnedMessage.id)}
        title="انقر للانتقال للرسالة"
      >
        <Pin size={14} className="flex-shrink-0 rotate-45 text-[var(--accent)]" />
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-bold text-[var(--accent)]">
            {pinnedMessage.sender_name || 'رسالة مثبتة'}:
          </span>
          <span className="truncate text-[var(--app-text)] opacity-90">
            {pinnedMessage.content || 'مرفق أو بطاقة تفاعلية'}
          </span>
        </div>
      </div>

      {canManage && onUnpin && (
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onUnpin(pinnedMessage.id);
          }}
          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)] hover:text-rose-500"
          title="إلغاء التثبيت"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
};
