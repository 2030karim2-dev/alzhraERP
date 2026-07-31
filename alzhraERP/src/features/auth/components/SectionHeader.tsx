import React from 'react';
import { motion } from 'framer-motion';

interface SectionHeaderProps {
    badge: string;
    title: string;
    description: string;
    accent?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ badge, title, description, accent = 'blue' }) => {
    const badgeColors = {
        blue: 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50',
        emerald: 'bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/50 dark:border-emerald-800/50',
        orange: 'bg-orange-100/80 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200/50 dark:border-orange-800/50',
    }[accent as 'blue' | 'emerald' | 'orange'] || 'bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200/50 dark:border-blue-800/50';

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
            <h2 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white mb-6 tracking-tight leading-[1.15]">
                {title.split(' ').map((word, i) => (
                    i === 2 ? <span key={i} className="text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent"> {word} </span> : word + ' '
                ))}
            </h2>
            <p className="text-gray-500 dark:text-slate-400 max-w-2xl mx-auto text-lg leading-relaxed font-medium">
                {description}
            </p>
        </motion.div>
    );
};
