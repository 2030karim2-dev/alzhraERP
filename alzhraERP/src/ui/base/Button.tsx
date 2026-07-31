
import React, { ButtonHTMLAttributes } from 'react';
import { cn } from '../../core/utils';
import Spinner from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success' | 'amber';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  disabled,
  ...props
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-lg font-semibold tracking-wide transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed border";

  const variants = {
    primary: "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm hover:shadow-md",
    secondary: "bg-slate-800 text-white border-slate-800 hover:bg-slate-900 hover:border-slate-900 shadow-sm hover:shadow-md dark:bg-slate-700 dark:border-slate-700 dark:hover:bg-slate-600",
    success: "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700 shadow-sm hover:shadow-md",
    amber: "bg-amber-500 text-white border-amber-500 hover:bg-amber-600 hover:border-amber-600 shadow-sm hover:shadow-md",
    outline: "bg-[var(--app-surface)] text-[var(--app-text)] border-[var(--app-border)] hover:bg-[var(--app-surface-hover)]",
    danger: "bg-rose-600 text-white border-rose-600 hover:bg-rose-700 hover:border-rose-700 shadow-sm hover:shadow-md",
    ghost: "bg-transparent border-transparent text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs gap-1.5 min-h-[32px]",
    md: "px-4 py-2 text-sm gap-2 min-h-[44px]",
    lg: "px-6 py-3 text-sm gap-3 min-h-[52px]",
  };

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Spinner size="sm" className="text-current opacity-70" />
      ) : (
        <>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          <span className="truncate">{children}</span>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
        </>
      )}
    </button>
  );
};

export default Button;