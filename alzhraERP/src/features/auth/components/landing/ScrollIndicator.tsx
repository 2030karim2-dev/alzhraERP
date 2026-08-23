import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface ScrollIndicatorProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

/**
 * مؤشر تمرير هادئ للنزول إلى قسم المميزات
 */
const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({
  onClick,
  label = 'استكشف المزيد',
  className = '',
}) => {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
      className={`group flex cursor-pointer flex-col items-center gap-1.5 ${className}`}
      aria-label={label}
    >
      <span className="text-[11px] font-bold text-slate-500 transition-colors group-hover:text-blue-600 dark:text-slate-400 dark:group-hover:text-blue-400">
        {label}
      </span>
      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white/80 text-slate-500 shadow-sm transition-colors group-hover:border-blue-400 group-hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400">
        <ChevronDown size={14} />
      </div>
    </motion.button>
  );
};

export default ScrollIndicator;
