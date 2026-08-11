import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { LANDING_FAQS } from '../../landing/landing.constants';

const FAQItem: React.FC<{ question: string; answer: string; isOpen: boolean; onToggle: () => void }> = React.memo(({ question, answer, isOpen, onToggle }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="landing-faq-item rounded-none border border-[var(--app-border)] bg-[var(--app-surface)] overflow-hidden shadow-sm hover:shadow-md transition-shadow"
    >
        <button
            onClick={onToggle}
            aria-expanded={isOpen}
            className="w-full flex items-center justify-between gap-2 sm:gap-4 p-3 sm:p-6 text-right"
        >
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                <HelpCircle size={14} className={`flex-shrink-0 ${isOpen ? 'text-blue-500' : 'text-[var(--app-text-secondary)]'} transition-colors sm:w-5 sm:h-5`} />
                <span className={`font-black text-[10px] sm:text-base uppercase tracking-tighter ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--app-text)]'} transition-colors`}>
                    {question}
                </span>
            </div>
            <motion.div
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3 }}
                className="flex-shrink-0"
            >
                <ChevronDown size={14} className={`${isOpen ? 'text-blue-500' : 'text-[var(--app-text-secondary)]'} transition-colors sm:w-5 sm:h-5`} />
            </motion.div>
        </button>
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    className="overflow-hidden"
                >
                    <div className="px-3 sm:px-6 pt-2 sm:pt-5 pb-3 sm:pb-6 text-[var(--app-text-secondary)] leading-tight sm:leading-relaxed font-black uppercase tracking-tighter text-[9px] sm:text-sm border-t border-[var(--app-border)] mx-3 sm:mx-6">
                        {answer}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </motion.div>
));

FAQItem.displayName = 'FAQItem';

const FAQSection: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggle = (i: number) => setOpenIndex(prev => (prev === i ? null : i));

    return (
        <section className="relative py-32 px-4 z-10 overflow-hidden" style={{ backgroundColor: 'var(--app-bg)' }}>
            <div className="max-w-none mx-auto">
                <SectionHeader
                    badge="الأسئلة الشائعة"
                    title="كل ما تريد معرفته عن نظام الزهراء"
                    highlightedWord="الزهراء"
                    description="إجابات سريعة على أكثر الأسئلة شيوعاً حول النظام. وإذا لم تجد سؤالك، فريق الدعم جاهز لمساعدتك."
                    accent="blue"
                />

                <div className="max-w-3xl mx-auto space-y-4">
                    {LANDING_FAQS.map((faq, i) => (
                        <FAQItem
                            key={i}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={openIndex === i}
                            onToggle={() => toggle(i)}
                        />
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center mt-16 pt-8 border-t border-[var(--app-border)]"
                >
                    <p className="text-sm text-[var(--app-text-secondary)] font-medium">
                        لم تجد إجابة لسؤالك؟{' '}
                        <a href="mailto:2030.krim2@gmail.com" className="text-blue-500 font-black hover:underline">
                            تواصل معنا مباشرة
                        </a>
                    </p>
                </motion.div>
            </div>
        </section>
    );
};

export default FAQSection;
