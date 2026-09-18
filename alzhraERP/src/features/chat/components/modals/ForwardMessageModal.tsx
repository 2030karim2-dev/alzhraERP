import React, { useState } from 'react';
import { X, Search, Send, Forward, Building2, User } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../../auth/store';

interface Props {
  isOpen: boolean;
  message: ChatMessage | null;
  onClose: () => void;
}

export const ForwardMessageModal: React.FC<Props> = ({ isOpen, message, onClose }) => {
  const { user } = useAuthStore();
  const { channels, sendMessage } = useChatStore();
  const [search, setSearch] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  if (!isOpen || !message) return null;

  const filteredChannels = channels.filter(ch => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return ch.name.toLowerCase().includes(q) || ch.branch_name?.toLowerCase().includes(q);
  });

  const handleForward = async () => {
    if (!selectedChannelId || !user || isSending) return;

    setIsSending(true);
    try {
      await sendMessage(
        {
          channel_id: selectedChannelId,
          content: message.content,
          message_type: message.message_type,
          metadata: {
            ...(message.metadata || {}),
            forwarded_from: message.sender_name || 'موظف',
            ...(message.attachments && message.attachments.length > 0
              ? { forwarded_attachments: message.attachments }
              : {}),
          },
        },
        user.id,
        user.full_name || user.email,
        undefined,
        user.company_id
      );

      onClose();
    } catch {
      // Handled in store
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="backdrop-blur-xs animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 duration-150">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--app-border)] p-3.5">
          <div className="flex items-center gap-2">
            <Forward size={18} className="text-[var(--accent)]" />
            <h3 className="text-sm font-bold text-[var(--app-text)]">إعادة توجيه الرسالة</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Message preview snippet */}
        <div className="bg-[var(--app-bg)]/50 border-b border-[var(--app-border)] p-3">
          <div className="border-s-3 rounded-lg border-[var(--accent)] bg-[var(--app-surface)] p-2 text-xs">
            <span className="text-[10px] font-bold text-[var(--accent)]">
              {message.sender_name || 'رسالة'}
            </span>
            <p className="line-clamp-2 text-[var(--app-text-secondary)]">
              {message.content || 'مرفق أو بطاقة تفاعلية'}
            </p>
          </div>
        </div>

        {/* Search destination */}
        <div className="p-3">
          <div className="relative">
            <Search
              size={14}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--app-text-secondary)]"
            />
            <input
              type="text"
              placeholder="ابحث عن محادثة أو زميل..."
              value={search}
              onChange={e => {
                setSearch(e.target.value);
              }}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] py-1.5 pe-3 ps-8 text-xs text-[var(--app-text)] outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Destination List */}
        <div className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {filteredChannels.map(ch => {
            const isSelected = selectedChannelId === ch.id;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  setSelectedChannelId(ch.id);
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl p-2 text-start transition-all ${
                  isSelected
                    ? 'bg-[var(--accent)] text-white'
                    : 'text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                    isSelected
                      ? 'border-white/30 bg-white/20 text-white'
                      : 'border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text-secondary)]'
                  }`}
                >
                  {ch.type === 'direct' ? <User size={15} /> : <Building2 size={15} />}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">{ch.name}</span>
                  {ch.branch_name && ch.type !== 'direct' && (
                    <span
                      className={`text-[10px] ${
                        isSelected ? 'text-white/80' : 'text-[var(--app-text-secondary)]'
                      }`}
                    >
                      {ch.branch_name}
                    </span>
                  )}
                </div>

                <input
                  type="radio"
                  name="forwardDestination"
                  checked={isSelected}
                  onChange={() => {
                    setSelectedChannelId(ch.id);
                  }}
                  className="accent-[var(--accent)]"
                />
              </button>
            );
          })}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--app-border)] p-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--app-border)] px-3 py-1.5 text-xs font-medium text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleForward}
            disabled={!selectedChannelId || isSending}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--accent)] px-4 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
          >
            <Send size={13} />
            <span>{isSending ? 'جاري الإرسال...' : 'إرسال'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
