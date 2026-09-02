import React, { type InputHTMLAttributes, forwardRef, useCallback } from 'react';
import { cn } from '../../core/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  error?: string | undefined;
  icon?: React.ReactNode | undefined;
  onIconClick?: (() => void) | undefined;
  variant?: 'default' | 'micro' | undefined;
  inputRef?: React.RefObject<HTMLInputElement> | undefined;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, error, icon, onIconClick, variant = 'default', inputRef, ...props },
    ref
  ) => {
    const isMicro = variant === 'micro';
    const combinedRef = (ref || inputRef) as React.RefObject<HTMLInputElement>;

    // Handle keyboard navigation between inputs
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          // Find next input in the parent form
          const form = combinedRef.current?.closest('form');
          if (form) {
            const inputs = form.querySelectorAll<HTMLInputElement>(
              'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), button:not([disabled])'
            );
            const currentIndex = Array.from(inputs).findIndex(
              input => input === combinedRef.current
            );

            if (currentIndex !== -1 && currentIndex < inputs.length - 1) {
              e.preventDefault();
              const nextInput = inputs[currentIndex + 1];
              // If next is a button, click it, otherwise focus it
              if (nextInput.tagName === 'BUTTON') {
                (nextInput as HTMLButtonElement).click();
              } else {
                nextInput.focus();
                // Select all text if it's an input or textarea
                if (nextInput.tagName === 'INPUT' || nextInput.tagName === 'TEXTAREA') {
                  nextInput.select();
                }
              }
            }
          }
        }
      },
      [combinedRef]
    );

    return (
      <div className="w-full">
        {label && (
          <label
            className={cn(
              'block px-1 font-medium text-[var(--app-text-secondary)]',
              isMicro ? 'mb-0.5 text-[10px]' : 'mb-1.5 text-xs'
            )}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={combinedRef}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full rounded-[var(--radius)] border border-[var(--app-border)] bg-[var(--app-bg)]',
              'font-medium text-[var(--app-text)] placeholder:text-[var(--app-text-secondary)] placeholder:opacity-60',
              'focus:ring-[var(--accent)]/20 focus:border-[var(--accent)] focus:outline-none focus:ring-2',
              'transition-all duration-200',
              isMicro
                ? 'rounded-[var(--radius)] px-2.5 py-2 text-xs max-md:py-1.5'
                : 'rounded-[var(--radius)] px-3.5 py-2.5 text-sm max-md:py-2 max-md:text-xs',
              icon ? (isMicro ? 'pr-8' : 'pr-9 max-md:pr-8') : 'px-3',
              error
                ? 'border-rose-500 ring-rose-500/30 focus:border-rose-500 focus:ring-rose-500/30'
                : '',
              'focus:shadow-sm',
              className
            )}
            {...props}
          />
          {icon && (
            <div
              onClick={onIconClick}
              className={cn(
                'absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--app-text-secondary)] transition-colors',
                onIconClick ? 'cursor-pointer hover:text-blue-600' : 'pointer-events-none'
              )}
            >
              {React.cloneElement(icon as React.ReactElement<any>, { size: isMicro ? 14 : 18 })}
            </div>
          )}
        </div>
        {error && <p className="mt-1 px-1 text-[11px] font-medium text-rose-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
