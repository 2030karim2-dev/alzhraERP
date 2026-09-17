import React, { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../../core/utils';

interface FocusViewProps {
  children: React.ReactNode;
  className?: string;
}

const FocusView: React.FC<FocusViewProps> = ({ children, className }) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={cn('relative', className)}>
      {/* Focus Toggle */}
      <button
        onClick={() => {
          setIsFocused(!isFocused);
        }}
        className={cn(
          'absolute right-2 top-2 z-10 rounded-xl transition-all duration-200 max-md:p-2',
          isFocused
            ? 'bg-blue-600 text-white shadow-lg'
            : 'border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
        )}
        title={isFocused ? 'خروج من وضع التركيز' : 'وضع التركيز'}
        aria-label={isFocused ? 'خروج من وضع التركيز' : 'تفعيل وضع التركيز'}
      >
        {isFocused ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
      </button>

      {/* Content */}
      {isFocused ? (
        <div className="custom-scrollbar animate-in zoom-in-95 fade-in fixed inset-0 z-[100] overflow-y-auto bg-[var(--app-bg)] duration-300">
          <div className="mx-auto max-w-4xl max-md:p-4 md:p-8">
            <button
              onClick={() => {
                setIsFocused(false);
              }}
              className="mb-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2 text-sm font-bold text-[var(--app-text)] transition-colors hover:bg-[var(--app-surface-hover)]"
            >
              ← رجوع
            </button>
            <div className="text-2xl font-black max-md:text-lg md:text-4xl">{children}</div>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
};

export default FocusView;
