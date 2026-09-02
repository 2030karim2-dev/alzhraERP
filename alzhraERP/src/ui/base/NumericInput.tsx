import React, { useRef, useCallback } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn, ensureLatinDigits } from '../../core/utils';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  disabled?: boolean;
  className?: string;
  /** Show thousands separator (e.g., 1,000,000) */
  formatThousands?: boolean;
  /** Show +/- stepper buttons */
  showSteppers?: boolean;
}

const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  disabled = false,
  className,
  showSteppers = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const parseInput = useCallback((input: string): number => {
    // Convert any Eastern Arabic / Persian digits to English digits
    const latin = ensureLatinDigits(input);
    // Remove non-numeric chars except minus and decimal
    const cleaned = latin.replace(/[^\d.\-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }, []);

  const clamp = useCallback(
    (val: number): number => {
      let result = val;
      if (min !== undefined && result < min) result = min;
      if (max !== undefined && result > max) result = max;
      return result;
    },
    [min, max]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const raw = e.target.value;
    // Allow typing freely, only clamp on blur
    const parsed = parseInput(raw);
    onChange(parsed);
  };

  const handleBlur = (): void => {
    onChange(clamp(value));
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    // Prevent non-numeric keys, but allow Arabic and English digits
    const allowed = [
      'Backspace',
      'Delete',
      'ArrowLeft',
      'ArrowRight',
      'Tab',
      'Home',
      'End',
      '.',
      '-',
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '٠',
      '١',
      '٢',
      '٣',
      '٤',
      '٥',
      '٦',
      '٧',
      '٨',
      '٩',
      '۰',
      '۱',
      '۲',
      '۳',
      '۴',
      '۵',
      '۶',
      '۷',
      '۸',
      '۹',
    ];
    if (e.ctrlKey || e.metaKey) return; // Allow Ctrl+C/V/X
    if (!allowed.includes(e.key)) {
      e.preventDefault();
    }
    // Arrow up/down = step
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(clamp(value + step));
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(clamp(value - step));
    }
  };

  const increment = (): void => {
    onChange(clamp(value + step));
  };
  const decrement = (): void => {
    onChange(clamp(value - step));
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="px-1 text-xs font-medium text-[var(--app-text-secondary)]">{label}</label>
      )}
      <div className="flex items-center">
        {showSteppers && (
          <button
            type="button"
            onClick={decrement}
            disabled={disabled || (min !== undefined && value <= min)}
            aria-label="تقليل"
            className="rounded-r-lg border border-r-0 border-[var(--app-border)] bg-[var(--app-surface-hover)] px-2 py-2 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface)] disabled:opacity-30"
          >
            <Minus size={14} />
          </button>
        )}
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={label || 'قيمة رقمية'}
          className={cn(
            'flex-1 border border-[var(--app-border)] bg-[var(--app-bg)]',
            'px-3 py-2 text-center text-sm font-bold text-[var(--app-text)]',
            'focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] focus:outline-none focus:ring-2',
            'font-mono tracking-wide transition-all duration-200',
            showSteppers ? 'rounded-none' : 'rounded-lg',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          dir="ltr"
        />
        {showSteppers && (
          <button
            type="button"
            onClick={increment}
            disabled={disabled || (max !== undefined && value >= max)}
            aria-label="زيادة"
            className="rounded-l-lg border border-l-0 border-[var(--app-border)] bg-[var(--app-surface-hover)] px-2 py-2 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface)] disabled:opacity-30"
          >
            <Plus size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default NumericInput;
