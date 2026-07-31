
import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../core/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <Loader2 
      className={cn("animate-spin text-accent", sizeClasses[size], className)} 
    />
  );
};

export default Spinner;
