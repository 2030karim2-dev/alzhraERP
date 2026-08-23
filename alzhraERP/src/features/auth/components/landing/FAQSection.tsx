import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { LANDING_FAQS, LANDING_CONTACT_EMAIL } from '../../landing/landing.constants';

/* eslint-disable max-lines-per-function -- عناصر وقسم الأسئلة الشائعة بصفحة الهبوط */
const FAQItem: React.FC<{
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  panelId: string;
}> = React.memo(({ question, answer, isOpen, onToggle, panelId }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="landing-faq-item overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm"
  >
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={panelId}
      className="flex w-full items-center justify-between gap-3 p-3 text-right sm:p-4"
    >
      <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
        <HelpCircle
          size={16}
          className={`flex-shrink-0 ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--app-text-secondary)]'} transition-colors`}
        />
        <span
          className={`text-xs font-bold sm:text-sm ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--app-text)]'} transition-colors`}
        >
          {question}
        </span>
      </div>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.2 }}
        className="flex-shrink-0"
      >
        <ChevronDown
          size={16}
          className={`${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--app-text-secondary)]'} transition-colors`}
        />
      </motion.div>
    </button>
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          id={panelId}
          role="region"
          aria-label={question}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="border-t border-[var(--app-border)] px-3 pb-3 pt-2 text-xs font-normal leading-relaxed text-[var(--app-text-secondary)] sm:px-4 sm:pb-4 sm:pt-3 sm:text-sm">
            {answer}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
));

FAQItem.displayName = 'FAQItem';

const FAQSection: React.FC<{ sectionRef?: React.RefObject<HTMLDivElement | null> }> = ({
  sectionRef,
}) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (i: number): void => {
    setOpenIndex(prev => (prev === i ? null : i));
  };

  return (
    <section
      ref={sectionRef}
      className="relative z-10 overflow-hidden px-4 py-12 sm:py-16"
      style={{ backgroundColor: 'var(--app-bg)' }}
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          badge="الأسئلة الشائعة"
          title="كل ما تريد معرفته عن نظام الزهراء"
          highlightedWord="الزهراء"
          description="إجابات سريعة وموجزة على أكثر الاستفسارات شيوعاً حول النظام."
          accent="blue"
        />

        <div className="mx-auto max-w-2xl space-y-2.5 sm:space-y-3">
          {LANDING_FAQS.map((faq, i) => (
            <FAQItem
              key={i}
              panelId={`faq-panel-${String(i)}`}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === i}
              onToggle={() => {
                toggle(i);
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 border-t border-[var(--app-border)] pt-5 text-center sm:mt-10"
        >
          <p className="text-xs font-medium text-[var(--app-text-secondary)] sm:text-sm">
            لم تجد إجابة لسؤالك؟{' '}
            <a
              href={`mailto:${LANDING_CONTACT_EMAIL}`}
              className="font-bold text-blue-600 hover:underline dark:text-blue-400"
            >
              تواصل معنا مباشرة
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
