import React from 'react';
import { motion } from 'framer-motion';

interface SectionHeaderProps {
    badge: string;
    title: string;
    highlightedWord?: string;
    description: string;
    accent?: 'blue' | 'emerald' | 'orange';
}

const badgeColorMap: Record<string, string> = {
    blue: 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50',
    emerald: 'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/50',
    orange: 'bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200/50 dark:border-orange-800/50',
    purple: 'bg-purple-100/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200/50 dark:border-purple-800/50',
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({ badge, title, highlightedWord, description, accent = 'blue' }) => {
    const badgeColors = badgeColorMap[accent] || badgeColorMap.blue;

    /** Splits the title on the highlighted word with word-boundary awareness */
    const renderTitle = () => {
        if (!highlightedWord) return title;
        // Use word boundary regex to avoid partial matches (e.g. "مخزن" inside "مخزون")
        const escaped = highlightedWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'g');
        const parts = title.split(regex);

        return parts.map((part, i) =>
            part === highlightedWord ? (
                <span key={i} className="text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                    {highlightedWord}
                </span>
            ) : (
                <React.Fragment key={i}>{part}</React.Fragment>
            )
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20 px-4"
        >
            <motion.span
                initial={{ scale: 0.9, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] mb-6 border shadow-sm backdrop-blur-sm ${badgeColors}`}
            >
                {badge}
            </motion.span>
            <h2 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight leading-[1.15]" style={{ color: 'var(--app-text, #111827)' }}>
                {renderTitle()}
            </h2>
            <p className="max-w-2xl mx-auto text-lg leading-relaxed font-medium" style={{ color: 'var(--app-text-secondary)' }}>
                {description}
            </p>
        </motion.div>
    );
};
