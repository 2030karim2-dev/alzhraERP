import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../../core/utils';

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
      <div
        className={cn(
          'flex aspect-square w-full items-center justify-center rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]',
          className
        )}
      >
        <span className="text-xs text-[var(--app-text-secondary)]">لا توجد صورة</span>
      </div>
    );
  }

  const selected = images[selectedIdx];

  return (
    <div className={cn('space-y-2', className)}>
      {/* Main Image */}
      <div className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-bg)]">
        <img
          src={selected.src}
          alt={selected.alt}
          className={cn(
            'h-full w-full object-contain transition-transform duration-300',
            isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in group-hover:scale-105'
          )}
          onClick={() => {
            setIsZoomed(!isZoomed);
          }}
        />
        {!isZoomed && images.length > 1 && (
          <>
            <button
              onClick={() => {
                setSelectedIdx(p => (p - 1 + images.length) % images.length);
              }}
              className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-white/80 opacity-0 shadow-lg backdrop-blur-sm transition-all group-hover:opacity-100 dark:bg-slate-800/80 max-md:opacity-100"
              aria-label="السابق"
            >
              <ChevronUp size={16} className="rotate-90" />
            </button>
            <button
              onClick={() => {
                setSelectedIdx(p => (p + 1) % images.length);
              }}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-white/80 opacity-0 shadow-lg backdrop-blur-sm transition-all group-hover:opacity-100 dark:bg-slate-800/80 max-md:opacity-100"
              aria-label="التالي"
            >
              <ChevronDown size={16} className="rotate-90" />
            </button>
          </>
        )}
        <span className="absolute bottom-2 right-2 rounded-lg bg-black/50 px-2 py-1 text-[10px] font-bold text-white">
          {selectedIdx + 1}/{images.length}
        </span>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="custom-scrollbar flex gap-1.5 overflow-x-auto pb-1">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => {
                setSelectedIdx(idx);
              }}
              className={cn(
                'h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                idx === selectedIdx
                  ? 'border-[var(--accent)] shadow-md'
                  : 'border-transparent opacity-60 hover:opacity-100'
              )}
            >
              <img
                src={img.thumbnail || img.src}
                alt={`${img.alt} - صورة ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
