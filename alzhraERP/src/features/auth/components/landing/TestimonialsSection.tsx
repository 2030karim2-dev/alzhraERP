import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { LANDING_TESTIMONIALS } from '../../landing/landing.constants';

const TestimonialsSection: React.FC = () => {
    const [current, setCurrent] = useState(0);
    const items = LANDING_TESTIMONIALS;

    const next = () => setCurrent(prev => (prev + 1) % items.length);
    const prev = () => setCurrent(prev => (prev - 1 + items.length) % items.length);

    return (
        <section className="relative py-32 px-4 z-10 overflow-hidden" style={{ backgroundColor: 'var(--app-surface)' }}>
            <div className="max-w-none mx-auto">
                <SectionHeader
                    badge="آراء العملاء"
                    title="ماذا يقول عملاؤنا عن النظام؟"
                    highlightedWord="عملاؤنا"
                    description="لا تأخذ كلامنا فقط... استمع لتجارب حقيقية من أصحاب مراكز قطع الغيار الذين يستخدمون النظام يومياً."
                    accent="orange"
                />

                <div className="relative max-w-4xl mx-auto">
                    <div className="flex justify-center gap-4 mb-12">
                        <button
                            onClick={prev} aria-label="السابق"
                            className="w-12 h-12 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center shadow-sm hover:border-blue-400 transition-all group"
                        >
                            <ChevronRight size={20} className="text-[var(--app-text-secondary)] group-hover:text-blue-500 transition-colors" />
                        </button>
                        <div className="flex gap-2 items-center">
                            {items.map((_, i) => (
                                <button
                                    key={i} onClick={() => setCurrent(i)}
                                    aria-label={`الانتقال للرأي رقم ${i + 1}`}
                                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                                        i === current ? 'bg-blue-500 w-8 shadow-md shadow-blue-500/30' : 'bg-gray-300 dark:bg-slate-600 hover:bg-blue-300'
                                    }`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={next} aria-label="التالي"
                            className="w-12 h-12 rounded-2xl bg-[var(--app-surface)] border border-[var(--app-border)] flex items-center justify-center shadow-sm hover:border-blue-400 transition-all group"
                        >
                            <ChevronLeft size={20} className="text-[var(--app-text-secondary)] group-hover:text-blue-500 transition-colors" />
                        </button>
                    </div>

                    {/* Carousel */}
                    <div className="relative overflow-hidden min-h-[280px]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={current}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.4 }}
                                className="bg-[var(--app-bg)] rounded-[2.5rem] p-8 lg:p-12 border border-[var(--app-border)] shadow-2xl shadow-blue-500/5"
                            >
                                <div className="flex items-center gap-1 mb-6">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={20}
                                            className={i < items[current].rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200 dark:text-slate-600'}
                                        />
                                    ))}
                                </div>
                                <blockquote className="text-lg lg:text-xl text-[var(--app-text)] leading-relaxed font-medium mb-8">
                                    «{items[current].text}»
                                </blockquote>
                                <div className="flex items-center gap-4 pt-6 border-t border-[var(--app-border)]">
                                    <div className={`w-12 h-12 ${items[current].avatarColor} rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg`}>
                                        {items[current].name.charAt(0)}
                                    </div>
                                    <div>
                                        <div className="font-black text-[var(--app-text)]">{items[current].name}</div>
                                        <div className="text-sm text-[var(--app-text-secondary)] font-medium">
                                            {items[current].role} — {items[current].company}
                                        </div>
                                        <div className="text-xs text-[var(--app-text-secondary)] mt-0.5">📍 {items[current].location}</div>
                                    </div>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TestimonialsSection;

