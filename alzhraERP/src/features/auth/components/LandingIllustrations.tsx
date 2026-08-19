import React from 'react';
import { motion } from 'framer-motion';

// ─── Step Illustration SVGs ─────────────────────────────────────────
/* eslint-disable max-lines-per-function -- مكوّن يحتوي رسومات SVG الثلاث لخطوات البداية */
export const StepIllustration: React.FC<{ step: number; className?: string }> = ({
  step,
  className = '',
}) => {
  const illustrations: Record<number, React.ReactNode> = {
    1: (
      <svg viewBox="0 0 120 120" fill="none" className={`h-full w-full ${className}`}>
        <defs>
          <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#3b82f6', stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: '#3b82f6', stopOpacity: 0.05 }} />
          </linearGradient>
        </defs>
        <rect
          x="15"
          y="25"
          width="90"
          height="70"
          rx="12"
          fill="url(#grad1)"
          className="stroke-blue-400/30"
          strokeWidth="1.5"
        />
        <rect x="25" y="38" width="30" height="8" rx="3" className="fill-blue-500 shadow-sm" />
        <rect
          x="25"
          y="52"
          width="50"
          height="4"
          rx="2"
          className="fill-gray-200 dark:fill-slate-700"
        />
        <rect
          x="25"
          y="62"
          width="40"
          height="4"
          rx="2"
          className="fill-gray-200 dark:fill-slate-700"
        />
        <rect
          x="25"
          y="72"
          width="60"
          height="4"
          rx="2"
          className="fill-gray-200 dark:fill-slate-700"
        />
        <motion.circle
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
          cx="85"
          cy="55"
          r="15"
          className="fill-blue-500/10"
        />
        <circle
          cx="85"
          cy="55"
          r="10"
          className="fill-blue-500/20 stroke-blue-500"
          strokeWidth="2"
        />
        <motion.path
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          d="M81 55l3 3 5-6"
          className="stroke-blue-500"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
    2: (
      <svg viewBox="0 0 120 120" fill="none" className={`h-full w-full ${className}`}>
        <defs>
          <linearGradient id="grad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#10b981', stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 0.05 }} />
          </linearGradient>
        </defs>
        <rect
          x="20"
          y="20"
          width="80"
          height="80"
          rx="12"
          fill="url(#grad2)"
          className="stroke-emerald-400/30"
          strokeWidth="1.5"
        />
        <rect x="32" y="32" width="56" height="12" rx="4" className="fill-emerald-500 shadow-sm" />
        <line
          x1="32"
          y1="52"
          x2="88"
          y2="52"
          className="stroke-gray-200 dark:stroke-slate-700"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />
        {[58, 68, 78].map((y, i) => (
          <motion.g
            key={y}
            initial={{ opacity: 0, x: -5 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
          >
            <rect
              x="32"
              y={y}
              width="40"
              height="4"
              rx="2"
              className="fill-gray-200 dark:fill-slate-700"
            />
            <rect x="76" y={y} width="12" height="4" rx="2" className="fill-emerald-400/40" />
          </motion.g>
        ))}
      </svg>
    ),
    3: (
      <svg viewBox="0 0 120 120" fill="none" className={`h-full w-full ${className}`}>
        <defs>
          <linearGradient id="grad3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: '#f59e0b', stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: '#f59e0b', stopOpacity: 0.05 }} />
          </linearGradient>
        </defs>
        <rect
          x="15"
          y="25"
          width="90"
          height="70"
          rx="12"
          fill="url(#grad3)"
          className="stroke-orange-400/30"
          strokeWidth="1.5"
        />
        {[
          { x: 28, h: 40 },
          { x: 42, h: 25 },
          { x: 56, h: 50 },
          { x: 70, h: 30 },
          { x: 84, h: 45 },
        ].map(({ x, h }, i) => (
          <motion.rect
            key={i}
            initial={{ height: 0, y: 90 }}
            whileInView={{ height: h, y: 90 - h }}
            transition={{ duration: 1, delay: i * 0.1, ease: 'easeOut' }}
            x={x}
            width="8"
            rx="3"
            className="fill-orange-500 shadow-sm"
            opacity={0.4 + i * 0.1}
          />
        ))}
        <motion.path
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          transition={{ duration: 1.5, delay: 0.5 }}
          d="M28 65l14-10 14-15 14 10 14-15"
          className="stroke-orange-600 shadow-lg"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  };
  // eslint-disable-next-line security/detect-object-injection -- جدول رسومات ثابت بمفاتيح رقمية 1|2|3
  return <>{illustrations[step] ?? null}</>;
};
