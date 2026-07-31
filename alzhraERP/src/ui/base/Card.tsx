
import React from 'react';
import { cn } from '../../core/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  noPadding?: boolean;
  isMicro?: boolean;
}

const Card: React.FC<CardProps> = ({ className, children, noPadding, isMicro, ...props }) => {
  return (
    <div
      className={cn(
        "bg-[var(--app-surface)] shadow-sm border border-[var(--app-border)] overflow-hidden transition-all duration-300",
        isMicro ? "rounded-lg" : "rounded-xl",
        !noPadding && (isMicro ? "p-2 sm:p-2.5" : "p-2.5 sm:p-3"),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
