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
    'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50',
  ],
  [
    'emerald',
    'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/50',
  ],
  [
    'orange',
    'bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200/50 dark:border-orange-800/50',
  ],
  [
    'purple',
    'bg-purple-100/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/50',
  ],
]);

// eslint-disable-next-line max-lines-per-function -- مكوّن رأس القسم يتجاوز 50 سطراً بتنسيق prettier المعتمد
export const SectionHeader: React.FC<SectionHeaderProps> = ({
  badge,
  title,
  highlightedWord,
  description,
  accent = 'blue',
}) => {
  const badgeColors = badgeColorMap.get(accent) ?? badgeColorMap.get('blue') ?? '';

  /** يفصل العنوان على الكلمة المميزة بمطابقة نصية حرفية (بلا RegExp ديناميكي) */
  const renderTitle = (): React.ReactNode => {
    if (highlightedWord === undefined) return title;
    const parts = title.split(highlightedWord);

    return parts.map((part, i) => (
      <React.Fragment key={i}>
        {i > 0 ? (
          <span className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-blue-600 text-transparent dark:text-blue-400">
            {highlightedWord}
          </span>
        ) : null}
        {part}
      </React.Fragment>
    ));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="mb-20 px-4 text-center"
    >
      <motion.span
        initial={{ scale: 0.9, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        className={`mb-6 inline-block rounded-full border px-4 py-1.5 text-xs font-black uppercase tracking-[0.15em] shadow-sm backdrop-blur-sm ${badgeColors}`}
      >
        {badge}
      </motion.span>
      <h2
        className="mb-6 text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl"
        style={{ color: 'var(--app-text, #111827)' }}
      >
        {renderTitle()}
      </h2>
      <p
        className="mx-auto max-w-2xl text-lg font-medium leading-relaxed"
        style={{ color: 'var(--app-text-secondary)' }}
      >
        {description}
      </p>
    </motion.div>
  );
};
