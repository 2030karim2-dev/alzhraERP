import React from 'react';
import { motion } from 'framer-motion';

interface SectionHeaderProps {
  badge: string;
  title: string;
  highlightedWord?: string;
  description: string;
  accent?: 'blue' | 'emerald' | 'orange';
}

const badgeColorMap = new Map<string, string>([
  [
    'blue',
    'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40',
  ],
  [
    'emerald',
    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40',
  ],
  [
    'orange',
    'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200/60 dark:border-orange-800/40',
  ],
  [
    'purple',
    'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/60 dark:border-purple-800/40',
  ],
]);

/* eslint-disable max-lines-per-function -- مكوّن رأس القسم المشترك لصفحة الهبوط */
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  badge,
  title,
  highlightedWord,
  description,
  accent = 'blue',
}) => {
  const badgeColors = badgeColorMap.get(accent) ?? badgeColorMap.get('blue') ?? '';

  const renderTitle = (): React.ReactNode => {
    if (highlightedWord === undefined) return title;
    const parts = title.split(highlightedWord);

    return parts.map((part, i) => (
      <React.Fragment key={i}>
        {i > 0 ? <span className="text-blue-600 dark:text-blue-400">{highlightedWord}</span> : null}
        {part}
      </React.Fragment>
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-8 px-4 text-center sm:mb-10"
    >
      <motion.span
        initial={{ scale: 0.95, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        className={`mb-3 inline-block rounded-lg border px-3 py-1 text-xs font-bold shadow-sm ${badgeColors}`}
      >
        {badge}
      </motion.span>
      <h2
        className="mb-3 text-2xl font-black leading-tight tracking-tight sm:text-3xl"
        style={{ color: 'var(--app-text, #0f172a)' }}
      >
        {renderTitle()}
      </h2>
      <p
        className="mx-auto max-w-xl text-xs font-medium leading-relaxed sm:text-sm"
        style={{ color: 'var(--app-text-secondary, #64748b)' }}
      >
        {description}
      </p>
    </motion.div>
  );
};
