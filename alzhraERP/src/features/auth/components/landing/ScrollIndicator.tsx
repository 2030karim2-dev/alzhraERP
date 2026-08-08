import React from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface ScrollIndicatorProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

/**
 * مؤشر تمرير متحرك للنزول إلى قسم المميزات
 */
const ScrollIndicator: React.FC<ScrollIndicatorProps> = ({ onClick, label = 'استكشف المزيد', className = '' }) => {
  return (
    <motion.button
      onClick={onClick}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.8 }}
      className={`flex flex-col items-center gap-3 cursor-pointer group ${className}`}
      aria-label={label}
    >
      <span className="text-xs font-black text-[var(--app-text-secondary)] uppercase tracking-[0.2em] group-hover:text-blue-500 transition-colors">
        {label}
      </span>
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="w-10 h-10 rounded-full bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center shadow-lg group-hover:border-blue-400 transition-colors"
      >
        <ChevronDown size={20} className="text-[var(--app-text-secondary)] group-hover:text-blue-500 transition-colors" />
      </motion.div>
    </motion.button>
  );
};

export default ScrollIndicator;
