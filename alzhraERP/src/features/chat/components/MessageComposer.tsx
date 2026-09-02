import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile, X, Layers, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../../auth/store';
import { EntityShareModal } from './EntityShareModal';
import type { EntityCardMetadata } from '../types';

interface Props {
  channelId: string;
  onTyping: (isTyping: boolean) => void;
}

const EMOJI_LIST = ['👍', '✅', '🚗', '📦', '❗', '❤️', '🔥', '🙏', '💯', '👏', '🛠️', '⚡'];

export const MessageComposer: React.FC<Props> = ({ channelId, onTyping }) => {
  const { user } = useAuthStore();
  const { sendMessage, replyingTo, setReplyingTo } = useChatStore();

  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [attachedEntity, setAttachedEntity] = useState<{
    metadata: EntityCardMetadata;
    isActionRequest?: boolean;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    onTyping(e.target.value.length > 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 15 * 1024 * 1024) {
        alert('حجم الملف يجب ألا يتجاوز 15 ميجابايت');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSend = async () => {
    if ((!text.trim() && !attachedEntity && !selectedFile) || isSending || !user) return;

    setIsSending(true);
    onTyping(false);

    try {
      let messageType: any = 'text';
      if (attachedEntity?.isActionRequest) {
        messageType = 'action_request';
      } else if (attachedEntity) {
        messageType = 'entity_card';
      } else if (selectedFile) {
        messageType = selectedFile.type.startsWith('image/') ? 'image' : 'file';
      }

      await sendMessage(
        {
          channel_id: channelId,
          content: text.trim(),
          message_type: messageType,
          metadata: attachedEntity ? attachedEntity.metadata : {},
          reply_to_id: replyingTo?.id || null,
        },
        user.id,
        user.full_name || user.email,
        selectedFile,
        user.company_id
      );

      // Clear state
      setText('');
      setAttachedEntity(null);
      setSelectedFile(null);
      setReplyingTo(null);
      setShowEmojiPicker(false);
    } catch (err) {
      // Error handled in store
    } finally {
      setIsSending(false);
    }
  };

  const handleSelectEntity = (metadata: EntityCardMetadata, isActionRequest?: boolean) => {
    setAttachedEntity({ metadata, isActionRequest: isActionRequest || false });
  };

  return (
    <div className="border-t border-[var(--app-border)] bg-[var(--app-surface)] p-3">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-6 w-1 rounded-full bg-[var(--accent)]" />
            <div>
              <span className="font-bold text-[var(--accent)]">{replyingTo.sender_name}</span>
              <p className="line-clamp-1 text-[var(--app-text-secondary)]">{replyingTo.content}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setReplyingTo(null);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Attached Entity Card Preview */}
      {attachedEntity && (
        <div className="bg-[var(--accent)]/10 border-[var(--accent)]/30 mb-2 flex items-center justify-between rounded-xl border p-2 text-xs">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-[var(--accent)]" />
            <div>
              <span className="font-bold text-[var(--app-text)]">
                {attachedEntity.metadata.title}
              </span>
              <p className="text-[11px] text-[var(--app-text-secondary)]">
                {attachedEntity.metadata.subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              setAttachedEntity(null);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/10"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="mb-2 flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-2 text-xs">
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-[var(--accent)]" />
            <span className="font-medium text-[var(--app-text)]">{selectedFile.name}</span>
          </div>
          <button
            onClick={() => {
              setSelectedFile(null);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/10"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input controls */}
      <div className="flex items-end gap-2">
        {/* ERP Card Sharing Button */}
        <button
          type="button"
          onClick={() => {
            setShowShareModal(true);
          }}
          title="مشاركة صنف أو طلب مناقلة"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--accent)] transition-all hover:bg-[var(--app-surface-hover)] active:scale-95"
        >
          <Layers size={18} />
        </button>

        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="إرفاق ملف أو صورة"
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text-secondary)] transition-all hover:bg-[var(--app-surface-hover)] active:scale-95"
        >
          <Paperclip size={18} />
        </button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

        {/* Emoji Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
            }}
            title="رموز تعبيرية"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text-secondary)] transition-all hover:bg-[var(--app-surface-hover)] active:scale-95"
          >
            <Smile size={18} />
          </button>

          {showEmojiPicker && (
            <div className="absolute bottom-11 start-0 z-20 grid grid-cols-4 gap-1.5 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-xl">
              {EMOJI_LIST.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => {
                    setText(prev => prev + emoji);
                    setShowEmojiPicker(false);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-[var(--app-surface-hover)] active:scale-125"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text Input */}
        <div className="relative flex-1">
          <textarea
            rows={1}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="اكتب رسالتك هنا... (Enter للإرسال)"
            className="max-h-28 min-h-[38px] w-full resize-none rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-2.5 text-xs text-[var(--app-text)] placeholder-[var(--app-text-secondary)] outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && !attachedEntity && !selectedFile) || isSending}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white shadow-md transition-all hover:opacity-90 active:scale-95 disabled:opacity-40"
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {/* Share Entity Modal */}
      <EntityShareModal
        isOpen={showShareModal}
        onClose={() => {
          setShowShareModal(false);
        }}
        onSelectEntity={handleSelectEntity}
      />
    </div>
  );
};
