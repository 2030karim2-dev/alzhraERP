import React, { useState, useEffect } from 'react';
import {
  Reply,
  Smile,
  FileText,
  Download,
  User,
  Pin,
  Forward,
  Copy,
  Trash2,
  Check,
} from 'lucide-react';
import type { ChatMessage, DeliveryStatus } from '../types';
import { EntityCardMessage } from './cards/EntityCardMessage';
import { useChatStore } from '../stores/chatStore';
import { attachmentService } from '../services/attachmentService';
import { MessageStatusTicks } from './messages/MessageStatusTicks';
import { AudioMessage } from './messages/AudioMessage';
import { MediaLightboxModal } from './modals/MediaLightboxModal';
import { ForwardMessageModal } from './modals/ForwardMessageModal';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  currentUserId: string;
  isDirectOnline?: boolean | undefined;
  peerLastReadMessageId?: string | null | undefined;
  isPeerRead?: boolean | undefined;
  isSearchMatch?: boolean | undefined;
  onReply: (message: ChatMessage) => void;
}

const QUICK_EMOJIS = ['👍', '✅', '🚗', '📦', '❗', '❤️', '🔥', '👏'];

export const MessageItem: React.FC<Props> = ({
  message,
  isOwn,
  currentUserId,
  isDirectOnline,
  peerLastReadMessageId,
  isPeerRead,
  isSearchMatch,
  onReply,
}) => {
  const { toggleReaction, pinMessage, deleteMessage } = useChatStore();
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    name: string;
  } | null>(null);
  const [isForwardOpen, setIsForwardOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const formattedTime = new Date(message.created_at).toLocaleTimeString('ar-SA-u-nu-latn', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleToggleEmoji = (emoji: string) => {
    toggleReaction(message.id, emoji, currentUserId);
    setShowEmojiPicker(false);
  };

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    }
  };

  const handleTogglePin = () => {
    pinMessage(message.id, currentUserId, !message.pinned_at);
  };

  const handleDelete = () => {
    if (window.confirm('هل تريد بالتأكيد حذف هذه الرسالة؟')) {
      deleteMessage(message.id);
    }
  };

  // Determine delivery status for ticks
  let deliveryStatus: DeliveryStatus = 'sent';
  if (message.is_optimistic) {
    deliveryStatus = 'pending';
  } else if (isPeerRead || (peerLastReadMessageId && peerLastReadMessageId === message.id)) {
    deliveryStatus = 'read';
  } else if (isDirectOnline) {
    deliveryStatus = 'delivered';
  }

  const effectiveAttachments = [
    ...(message.attachments || []),
    ...(((message.metadata as any)?.forwarded_attachments as any[]) || []),
  ];

  const isAudio =
    message.message_type === 'audio' ||
    Boolean(
      effectiveAttachments.some(
        a =>
          a.mime_type.startsWith('audio/') ||
          a.file_name.endsWith('.webm') ||
          a.file_name.endsWith('.mp3')
      )
    );

  const audioAttachment = isAudio
    ? effectiveAttachments.find(
        a =>
          a.mime_type.startsWith('audio/') ||
          a.file_name.endsWith('.webm') ||
          a.file_name.endsWith('.mp3')
      )
    : null;

  return (
    <>
      <div
        id={`msg-${message.id}`}
        className={`group my-2 flex gap-2.5 transition-all ${
          isOwn ? 'flex-row-reverse' : 'flex-row'
        } ${isSearchMatch ? 'rounded-2xl bg-amber-500/5 p-1 ring-2 ring-amber-500/50' : ''}`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0 self-end">
          {message.sender_avatar ? (
            <img
              src={message.sender_avatar}
              alt={message.sender_name || 'موظف'}
              className="h-7 w-7 rounded-full border border-[var(--app-border)] object-cover"
            />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--app-border)] bg-[var(--app-surface-hover)] text-xs font-bold text-[var(--app-text)]">
              {message.sender_name ? (
                message.sender_name.charAt(0).toUpperCase()
              ) : (
                <User size={13} />
              )}
            </div>
          )}
        </div>

        {/* Message Bubble Container */}
        <div
          className={`flex max-w-[85%] flex-col sm:max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}
        >
          {/* Sender Name & Branch Header (only for incoming messages) */}
          {!isOwn && (
            <div className="mb-0.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold text-[var(--app-text-secondary)]">
              <span>{message.sender_name || 'موظف'}</span>
              {message.sender_branch && (
                <span className="py-0.2 rounded border border-[var(--app-border)] bg-[var(--app-bg)] px-1 text-[10px] text-[var(--app-text-secondary)]">
                  {message.sender_branch}
                </span>
              )}
            </div>
          )}

          {/* Main WhatsApp-Style Bubble with Tail */}
          <div
            className={`relative rounded-2xl p-2.5 shadow-xs transition-all ${
              isOwn
                ? 'rounded-br-xs bg-[var(--accent)] text-white'
                : 'rounded-bl-xs border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)]'
            }`}
          >
            {/* Pinned Badge */}
            {message.pinned_at && (
              <div
                className={`mb-1.5 flex items-center gap-1 text-[10px] font-bold ${
                  isOwn ? 'text-white/80' : 'text-[var(--accent)]'
                }`}
              >
                <Pin size={11} className="rotate-45" />
                <span>رسالة مثبتة</span>
              </div>
            )}

            {/* Forwarded Header */}
            {message.metadata && (message.metadata as any).forwarded_from && (
              <div
                className={`mb-1 flex items-center gap-1 text-[10px] italic ${
                  isOwn ? 'text-white/70' : 'text-[var(--app-text-secondary)]'
                }`}
              >
                <Forward size={11} />
                <span>معاد توجيهها من {(message.metadata as any).forwarded_from}</span>
              </div>
            )}

            {/* Reply Context Bar */}
            {message.reply_to_message && (
              <div
                className={`border-s-3 mb-2 rounded-lg p-2 text-xs opacity-95 ${
                  isOwn
                    ? 'border-white/70 bg-black/15 text-white/95'
                    : 'border-[var(--accent)] bg-[var(--app-bg)] text-[var(--app-text-secondary)]'
                }`}
              >
                <div className="text-[10px] font-bold">
                  {message.reply_to_message.sender_name || 'رد على رسالة'}
                </div>
                <p className="line-clamp-1">{message.reply_to_message.content}</p>
              </div>
            )}

            {/* Voice Note Audio Player */}
            {isAudio ? (
              <AudioMessage
                attachment={audioAttachment || undefined}
                directUrl={
                  typeof (message.metadata as any)?.audio_url === 'string'
                    ? (message.metadata as any).audio_url
                    : undefined
                }
                isOwn={isOwn}
                duration={
                  typeof (message.metadata as any)?.duration === 'number'
                    ? (message.metadata as any).duration
                    : undefined
                }
              />
            ) : null}

            {/* Text Message Content */}
            {message.content && (
              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed sm:text-sm">
                {message.content}
              </p>
            )}

            {/* ERP Entity Card */}
            {message.metadata && (message.metadata as any).entity_type && (
              <EntityCardMessage messageId={message.id} metadata={message.metadata as any} />
            )}

            {/* Non-audio Attachments */}
            {effectiveAttachments &&
              effectiveAttachments.filter(
                a => !a.mime_type.startsWith('audio/') && !a.file_name.endsWith('.webm')
              ).length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {effectiveAttachments
                    .filter(
                      a => !a.mime_type.startsWith('audio/') && !a.file_name.endsWith('.webm')
                    )
                    .map(att => (
                      <ChatAttachmentItem
                        key={att.id}
                        attachment={att}
                        isOwn={isOwn}
                        onImageClick={url => {
                          setLightboxImage({ url, name: att.file_name });
                        }}
                      />
                    ))}
                </div>
              )}

            {/* Timestamp & WhatsApp Status Footer */}
            <div
              className={`mt-1 flex items-center justify-end gap-1 text-[10px] font-medium ${
                isOwn ? 'text-white/75' : 'text-[var(--app-text-secondary)]'
              }`}
            >
              <span>{formattedTime}</span>
              {isOwn && (
                <MessageStatusTicks status={deliveryStatus} isOptimistic={message.is_optimistic} />
              )}
            </div>
          </div>

          {/* Reactions List */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {message.reactions.map(reaction => (
                <button
                  key={reaction.id}
                  onClick={() => {
                    handleToggleEmoji(reaction.emoji);
                  }}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all ${
                    reaction.user_id === currentUserId
                      ? 'bg-[var(--accent)]/10 border-[var(--accent)] text-[var(--accent)]'
                      : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
                  }`}
                >
                  <span>{reaction.emoji}</span>
                </button>
              ))}
            </div>
          )}

          {/* Hover Action Toolbar (WhatsApp style) */}
          <div
            className={`mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 ${
              isOwn ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Reply */}
            <button
              onClick={() => {
                onReply(message);
              }}
              title="رد"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-surface)] text-[var(--app-text-secondary)] shadow-sm hover:text-[var(--accent)]"
            >
              <Reply size={12} />
            </button>

            {/* Reaction */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                }}
                title="تفاعل"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-surface)] text-[var(--app-text-secondary)] shadow-sm hover:text-[var(--accent)]"
              >
                <Smile size={12} />
              </button>

              {showEmojiPicker && (
                <div className="animate-in zoom-in-90 absolute top-7 z-20 flex gap-1 rounded-full border border-[var(--app-border)] bg-[var(--app-surface)] p-1 shadow-lg duration-100">
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => {
                        handleToggleEmoji(emoji);
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs hover:bg-[var(--app-surface-hover)] active:scale-125"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Forward */}
            <button
              onClick={() => {
                setIsForwardOpen(true);
              }}
              title="إعادة توجيه"
              className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-surface)] text-[var(--app-text-secondary)] shadow-sm hover:text-[var(--accent)]"
            >
              <Forward size={12} />
            </button>

            {/* Copy */}
            {message.content && (
              <button
                onClick={handleCopy}
                title={copied ? 'تم النسخ!' : 'نسخ النص'}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-surface)] text-[var(--app-text-secondary)] shadow-sm hover:text-[var(--accent)]"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              </button>
            )}

            {/* Pin */}
            <button
              onClick={handleTogglePin}
              title={message.pinned_at ? 'إلغاء التثبيت' : 'تثبيت الرسالة'}
              className={`flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-surface)] shadow-sm ${
                message.pinned_at
                  ? 'text-[var(--accent)]'
                  : 'text-[var(--app-text-secondary)] hover:text-[var(--accent)]'
              }`}
            >
              <Pin size={12} className="rotate-45" />
            </button>

            {/* Delete (if sender) */}
            {isOwn && (
              <button
                onClick={handleDelete}
                title="حذف الرسالة"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--app-surface)] text-[var(--app-text-secondary)] shadow-sm hover:text-rose-500"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <MediaLightboxModal
        isOpen={Boolean(lightboxImage)}
        imageUrl={lightboxImage?.url || null}
        fileName={lightboxImage?.name}
        senderName={message.sender_name}
        timestamp={formattedTime}
        onClose={() => {
          setLightboxImage(null);
        }}
      />

      {/* Forward Modal */}
      <ForwardMessageModal
        isOpen={isForwardOpen}
        message={message}
        onClose={() => {
          setIsForwardOpen(false);
        }}
      />
    </>
  );
};

const ChatAttachmentItem: React.FC<{
  attachment: NonNullable<ChatMessage['attachments']>[number];
  isOwn: boolean;
  onImageClick?: (url: string) => void;
}> = ({ attachment, isOwn, onImageClick }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(attachment.public_url || null);
  const isImage = attachment.mime_type.startsWith('image/');

  useEffect(() => {
    if (signedUrl || !attachment.storage_path) return;

    let isMounted = true;
    attachmentService.getAttachmentSignedUrl(attachment.storage_path).then(url => {
      if (isMounted && url) {
        setSignedUrl(url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [attachment.storage_path, signedUrl]);

  if (isImage) {
    return (
      <div className="relative overflow-hidden rounded-xl bg-black/5">
        {signedUrl ? (
          <img
            src={signedUrl}
            alt={attachment.file_name}
            className="max-h-64 max-w-full cursor-pointer rounded-xl object-contain transition-transform hover:scale-[1.01]"
            onClick={() => {
              if (onImageClick) {
                onImageClick(signedUrl);
              } else {
                window.open(signedUrl, '_blank', 'noopener,noreferrer');
              }
            }}
          />
        ) : (
          <div className="flex h-36 w-48 items-center justify-center rounded-xl bg-[var(--app-bg)] text-xs text-[var(--app-text-secondary)]">
            جاري تحميل الصورة...
          </div>
        )}
      </div>
    );
  }

  return (
    <a
      href={signedUrl || '#'}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-2 rounded-xl p-2.5 text-xs font-semibold transition-all ${
        isOwn
          ? 'bg-white/20 text-white hover:bg-white/30'
          : 'bg-[var(--app-bg)] text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]'
      }`}
    >
      <FileText size={16} />
      <span className="line-clamp-1">{attachment.file_name}</span>
      <Download size={14} className="ms-auto flex-shrink-0" />
    </a>
  );
};
