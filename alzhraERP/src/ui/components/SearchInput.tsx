import React, { useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { cn } from '../../core/utils';

export interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
    autoFocus?: boolean;
    dir?: 'rtl' | 'ltr';
    className?: string;
    inputClassName?: string;
    /** Defaults to primary (blue-themed like the main products page search) */
    variant?: 'primary' | 'default' | 'minimal';
    size?: 'sm' | 'md' | 'lg';
    /** Show clear button when value exists */
    clearable?: boolean;
    /** Input type */
    type?: string;
    /** Called when user presses Enter */
    onSubmit?: (e: React.FormEvent) => void;
    /** Called when Escape is pressed */
    onEscape?: () => void;
    /** Additional keyboard handler */
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    /** id for aria-labels */
    id?: string;
}

const variantStyles = {
    primary: {
        container: 'bg-blue-50/50 dark:bg-blue-900/20 border-blue-500/30 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 ring-1 ring-blue-500/10 shadow-sm shadow-blue-500/5',
        input: 'placeholder:text-blue-400 dark:placeholder:text-blue-300',
        icon: 'text-blue-500',
        clear: 'text-blue-400 hover:text-rose-500',
        loader: 'text-blue-500',
    },
    default: {
        container: 'bg-[var(--app-bg)] border-[var(--app-border)] focus-within:ring-1 focus-within:ring-blue-500/20 focus-within:border-blue-500',
        input: 'placeholder:text-[var(--app-text-secondary)]',
        icon: 'text-[var(--app-text-secondary)] group-focus-within:text-blue-500',
        clear: 'text-gray-400 hover:text-rose-500',
        loader: 'text-blue-500',
    },
    minimal: {
        container: 'bg-transparent border-transparent focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:border-gray-200 dark:focus-within:border-slate-700 focus-within:ring-1 focus-within:ring-blue-500/20',
        input: 'placeholder:text-gray-400 dark:placeholder:text-slate-400',
        icon: 'text-gray-400',
        clear: 'text-gray-400 hover:text-rose-500',
        loader: 'text-indigo-500',
    },
};

const sizeStyles = {
    sm: {
        input: 'py-1.5 ps-9 pe-9 text-xs',
        iconOffset: 'top-1.5',
        clearOffset: 'top-1.5',
    },
    md: {
        input: 'py-2 ps-10 pe-10 text-sm',
        iconOffset: 'top-2',
        clearOffset: 'top-2',
    },
    lg: {
        input: 'py-5 ps-14 pe-14 text-base md:text-lg',
        iconOffset: 'top-5',
        clearOffset: 'top-5',
    },
};

const SearchInput: React.FC<SearchInputProps> = ({
    value,
    onChange,
    placeholder = 'بحث...',
    disabled = false,
    loading = false,
    autoFocus = false,
    dir = 'rtl',
    className,
    inputClassName,
    variant = 'primary',
    size = 'sm',
    clearable = true,
    type = 'text',
    onSubmit,
    onEscape,
    onKeyDown,
    id,
}) => {
    const v = variantStyles[variant];
    const s = sizeStyles[size];
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            onChange('');
            onEscape?.();
            inputRef.current?.blur();
        }
        if (e.key === 'Enter' && onSubmit) {
            onSubmit(e);
        }
        onKeyDown?.(e);
    };

    const handleClear = () => {
        onChange('');
        inputRef.current?.focus();
    };

    // Auto-focus support
    useEffect(() => {
        if (autoFocus) {
            inputRef.current?.focus();
        }
    }, [autoFocus]);

    const iconPosition = dir === 'rtl' ? 'right-3' : 'left-3';
    const clearPosition = dir === 'rtl' ? 'left-3' : 'right-3';

    return (
        <div
            className={cn(
                'relative group w-full rounded-lg border transition-all',
                v.container,
                disabled && 'opacity-60 cursor-not-allowed',
                className
            )}
        >
            <input
                ref={inputRef}
                id={id}
                type={type}
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                dir={dir}
                className={cn(
                    'w-full bg-transparent border-none rounded-lg outline-none text-[var(--app-text)] font-bold transition-all',
                    s.input,
                    v.input,
                    inputClassName
                )}
                aria-label={placeholder}
            />

            {/* Search Icon */}
            <Search
                className={cn(
                    'absolute text-blue-500 transition-colors pointer-events-none',
                    iconPosition,
                    s.iconOffset,
                    v.icon
                )}
                size={size === 'lg' ? 20 : 14}
            />

            {/* Loading Spinner or Clear Button */}
            <div className={cn('absolute', clearPosition, s.clearOffset)}>
                {loading ? (
                    <Loader2
                        className={cn('animate-spin', v.loader)}
                        size={size === 'lg' ? 18 : 14}
                    />
                ) : (
                    clearable &&
                    value && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className={cn(
                                'transition-colors hover:scale-110 active:scale-90',
                                v.clear
                            )}
                            aria-label="مسح البحث"
                        >
                            <X size={size === 'lg' ? 18 : 14} />
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

export default SearchInput;
