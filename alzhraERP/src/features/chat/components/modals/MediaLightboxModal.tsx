import React, { useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  imageUrl: string | null;
  fileName?: string | null | undefined;
  senderName?: string | null | undefined;
  timestamp?: string | null | undefined;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<Props> = ({
  isOpen,
  imageUrl,
  fileName = 'صورة',
  senderName,
  timestamp,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md duration-150"
      onClick={onClose}
    >
      {/* Top action header */}
      <div
        className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-3 text-white"
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <div className="flex flex-col">
          <span className="text-xs font-bold sm:text-sm">{fileName}</span>
          {(senderName || timestamp) && (
            <span className="text-[11px] text-white/60">
              {senderName} {timestamp ? `• ${timestamp}` : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Download button */}
          <a
            href={imageUrl}
            download={fileName || 'image'}
            target="_blank"
            rel="noreferrer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-all hover:bg-white/10 hover:text-white"
            title="تحميل الصورة"
          >
            <Download size={18} />
          </a>

          {/* External link */}
          <button
            type="button"
            onClick={() => window.open(imageUrl, '_blank')}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-all hover:bg-white/10 hover:text-white"
            title="فتح في تبويب جديد"
          >
            <ExternalLink size={18} />
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition-all hover:bg-white/10 hover:text-white"
            title="إغلاق (Esc)"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Image Stage */}
      <div className="flex flex-1 items-center justify-center p-4" onClick={onClose}>
        <img
          src={imageUrl}
          alt={fileName || 'صورة'}
          className="max-h-[85vh] max-w-[95vw] rounded-lg object-contain shadow-2xl transition-transform"
          onClick={e => {
            e.stopPropagation();
          }}
        />
      </div>
    </div>
  );
};
