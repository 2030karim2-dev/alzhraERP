
import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../core/utils';
import { IconColor } from '../../core/types';

interface IconProps {
  icon: LucideIcon;
  color?: IconColor;
  className?: string;
  size?: number;
}

// This map contains all the Tailwind classes, so they are not purged.
const colorClasses: Record<IconColor, { normal: string, groupHover: string }> = {
  purple: { normal: 'text-purple-500', groupHover: 'group-hover:text-purple-600 dark:group-hover:text-purple-400' },
  green: { normal: 'text-emerald-500', groupHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400' },
  blue: { normal: 'text-blue-500', groupHover: 'group-hover:text-blue-600 dark:group-hover:text-blue-400' },
  sky: { normal: 'text-sky-500', groupHover: 'group-hover:text-sky-600 dark:group-hover:text-sky-400' },
  orange: { normal: 'text-orange-500', groupHover: 'group-hover:text-orange-600 dark:group-hover:text-orange-400' },
  red: { normal: 'text-red-500', groupHover: 'group-hover:text-red-600 dark:group-hover:text-red-400' },
  indigo: { normal: 'text-indigo-500', groupHover: 'group-hover:text-indigo-600 dark:group-hover:text-indigo-400' },
  pink: { normal: 'text-pink-500', groupHover: 'group-hover:text-pink-600 dark:group-hover:text-pink-400' },
  teal: { normal: 'text-teal-500', groupHover: 'group-hover:text-teal-600 dark:group-hover:text-teal-400' },
  yellow: { normal: 'text-yellow-500', groupHover: 'group-hover:text-yellow-600 dark:group-hover:text-yellow-400' },
  emerald: { normal: 'text-emerald-500', groupHover: 'group-hover:text-emerald-600 dark:group-hover:text-emerald-400' },
  slate: { normal: 'text-slate-400 dark:text-slate-500', groupHover: 'group-hover:text-slate-600 dark:group-hover:text-slate-300' },
};

const Icon: React.FC<IconProps> = ({ icon: LucideIcon, color = 'slate', className, size = 16 }) => {
  const theme = colorClasses[color];
  return (
    <LucideIcon
      size={size}
      className={cn(
        'transition-colors duration-200',
        theme.normal,
        theme.groupHover,
        className
      )}
    />
  );
};

export default Icon;
