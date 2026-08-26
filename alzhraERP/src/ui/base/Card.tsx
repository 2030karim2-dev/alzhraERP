
import React from 'react';
import { cn } from '../../core/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
  isMicro?: boolean;
  /** 'default' uses the app's rounded-xl; 'ledger' uses sharp corners (rounded-none) for finance/ledger look. */
  variant?: 'default' | 'ledger' | undefined;
}

const Card: React.FC<CardProps> = ({ className, children, noPadding, isMicro, variant = 'default', ...props }) => {
  const isLedger = variant === 'ledger';
  return (
    <div
      className={cn(
        "bg-[var(--app-surface)] shadow-sm border border-[var(--app-border)] overflow-hidden transition-all duration-300",
        isLedger ? "rounded-none" : isMicro ? "rounded-lg" : "rounded-xl",
        !noPadding && (isMicro ? "p-2 sm:p-2.5" : isLedger ? "p-3" : "p-2.5 sm:p-3"),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
