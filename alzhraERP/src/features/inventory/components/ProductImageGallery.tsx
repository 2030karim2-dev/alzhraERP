import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { cn } from '../../core/utils';

interface ProductImage {
  src: string;
  alt: string;
  thumbnail?: string;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  className?: string;
}

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({ images, className }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  if (images.length === 0) {
    return (
      <div className={cn('w-full aspect-square bg-[var(--app-bg)] rounded-2xl flex items-center justify-center border border-[var(--app-border)]', className)}>
        <span className="text-xs text-[var(--app-text-secondary)]">لا توجد صورة</span>
      </div>
    );
  }

  const selected = images[selectedIdx];

  return (
    <div className={cn('space-y-2', className)}>
      {/* Main Image */}
      <div className="relative w-full aspect-square bg-[var(--app-bg)] rounded-2xl overflow-hidden border border-[var(--app-border)] group">
        <img
          src={selected.src}
          alt={selected.alt}
          className={cn(
            'w-full h-full object-contain transition-transform duration-300',
            isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in group-hover:scale-105',
          )}
          onClick={() => setIsZoomed(!isZoomed)}
        />
        {!isZoomed && images.length > 1 && (
          <>
            <button
              onClick={() => setSelectedIdx(p => (p - 1 + images.length) % images.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
              aria-label="السابق"
            >
              <ChevronUp size={16} className="rotate-90" />
            </button>
            <button
              onClick={() => setSelectedIdx(p => (p + 1) % images.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
              aria-label="التالي"
            >
              <ChevronDown size={16} className="rotate-90" />
            </button>
          </>
        )}
        <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-black/50 text-white px-2 py-1 rounded-lg">
          {selectedIdx + 1}/{images.length}
        </span>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIdx(idx)}
              className={cn(
                'w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all',
                idx === selectedIdx
                  ? 'border-[var(--accent)] shadow-md'
                  : 'border-transparent opacity-60 hover:opacity-100',
              )}
            >
              <img
                src={img.thumbnail || img.src}
                alt={`${img.alt} - صورة ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
