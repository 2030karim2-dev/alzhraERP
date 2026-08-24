import React, { useState } from 'react';
import { Reply, Smile, Check, Clock, FileText, Download, User } from 'lucide-react';
import type { ChatMessage } from '../types';
import { EntityCardMessage } from './cards/EntityCardMessage';
import { useChatStore } from '../stores/chatStore';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  currentUserId: string;
  onReply: (message: ChatMessage) => void;
}

const QUICK_EMOJIS = ['👍', '✅', '🚗', '📦', '❗', '❤️'];

export const MessageItem: React.FC<Props> = ({ message, isOwn, currentUserId, onReply }) => {
  const { toggleReaction } = useChatStore();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const formattedTime = new Date(message.created_at).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleToggleEmoji = (emoji: string) => {
    toggleReaction(message.id, emoji, currentUserId);
    setShowEmojiPicker(false);
  };

  return (
    <div className={`group flex gap-2.5 my-3.5 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className="flex-shrink-0">
        {message.sender_avatar ? (
          <img
            src={message.sender_avatar}
            alt={message.sender_name || 'موظف'}
            className="h-8 w-8 rounded-full object-cover border border-[var(--app-border)]"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--app-surface-hover)] text-xs font-bold text-[var(--app-text)] border border-[var(--app-border)]">
            {message.sender_name ? message.sender_name.charAt(0).toUpperCase() : <User size={14} />}
          </div>
        )}
      </div>

      {/* Message Bubble Container */}
      <div className={`flex max-w-[80%] flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender Name & Branch Header (only for incoming messages) */}
        {!isOwn && (
          <div className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold text-[var(--app-text-secondary)]">
            <span>{message.sender_name || 'موظف'}</span>
            {message.sender_branch && (
              <span className="rounded bg-[var(--app-bg)] px-1.5 py-0.2 text-[9px] text-[var(--app-text-secondary)] border border-[var(--app-border)]">
                {message.sender_branch}
              </span>
            )}
          </div>
        )}

        {/* Main Bubble */}
        <div
          className={`relative rounded-2xl p-3 shadow-sm transition-all ${
            isOwn
              ? 'bg-[var(--accent)] text-white rounded-tr-xs'
              : 'bg-[var(--app-surface)] text-[var(--app-text)] border border-[var(--app-border)] rounded-tl-xs'
          }`}
        >
          {/* Reply Context Bar */}
          {message.reply_to_message && (
            <div
              className={`mb-2 rounded-lg border-s-3 p-2 text-xs opacity-90 ${
                isOwn
                  ? 'border-white/60 bg-black/15 text-white/90'
                  : 'border-[var(--accent)] bg-[var(--app-bg)] text-[var(--app-text-secondary)]'
              }`}
            >
              <div className="text-[10px] font-bold">
                {message.reply_to_message.sender_name || 'رد على رسالة'}
              </div>
              <p className="line-clamp-1">{message.reply_to_message.content}</p>
            </div>
          )}

          {/* Text Message Content */}
          {message.content && (
            <p className="whitespace-pre-wrap break-words text-xs sm:text-sm leading-relaxed">
              {message.content}
            </p>
          )}

          {/* ERP Entity Card */}
          {message.metadata && (message.metadata as any).entity_type && (
            <EntityCardMessage messageId={message.id} metadata={message.metadata as any} />
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {message.attachments.map((att) => {
                const isImage = att.mime_type.startsWith('image/');
                return (
                  <div key={att.id}>
                    {isImage ? (
                      <img
                        src={att.public_url || att.storage_path}
                        alt={att.file_name}
                        className="max-h-56 rounded-xl object-cover"
                      />
                    ) : (
                      <a
                        href={att.public_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={`flex items-center gap-2 rounded-xl p-2 text-xs font-semibold ${
                          isOwn ? 'bg-white/20 text-white' : 'bg-[var(--app-bg)] text-[var(--app-text)]'
                        }`}
                      >
                        <FileText size={16} />
                        <span className="line-clamp-1">{att.file_name}</span>
                        <Download size={14} className="ms-auto" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Timestamp & Status footer */}
          <div
            className={`mt-1.5 flex items-center justify-end gap-1 text-[9px] ${
              isOwn ? 'text-white/70' : 'text-[var(--app-text-secondary)]'
            }`}
          >
            <span>{formattedTime}</span>
            {isOwn && (
              message.is_optimistic ? (
                <Clock size={10} className="animate-spin" />
              ) : (
                <Check size={11} className="text-white" />
              )
            )}
          </div>
        </div>

        {/* Reactions List */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.id}
                onClick={() => handleToggleEmoji(reaction.emoji)}
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all ${
                  reaction.user_id === currentUserId
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
                }`}
              >
                <span>{reaction.emoji}</span>
              </button>
            ))}
          </div>
        )}

        {/* Hover Quick Action Toolbar */}
        <div
          className={`mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${
            isOwn ? 'flex-row-reverse' : 'flex-row'
          }`}
        >
          <button
            onClick={() => onReply(message)}
            title="رد"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-surface)] text-[var(--app-text-secondary)] shadow-sm hover:text-[var(--accent)]"
          >
            <Reply size={12} />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="تفاعل"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-surface)] text-[var(--app-text-secondary)] shadow-sm hover:text-[var(--accent)]"
            >
              <Smile size={12} />
            </button>

            {showEmojiPicker && (
              <div className="absolute top-7 z-10 flex gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] p-1 shadow-lg">
                {QUICK_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleToggleEmoji(emoji)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs hover:bg-[var(--app-surface-hover)] active:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
