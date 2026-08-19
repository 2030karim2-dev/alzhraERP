import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { LANDING_FAQS, LANDING_CONTACT_EMAIL } from '../../landing/landing.constants';

const FAQItem: React.FC<{
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  panelId: string;
  // eslint-disable-next-line max-lines-per-function -- عنصر FAQ واحد بكل محتواه
}> = React.memo(({ question, answer, isOpen, onToggle, panelId }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className="landing-faq-item overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm transition-shadow hover:shadow-md"
  >
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      aria-controls={panelId}
      className="flex w-full items-center justify-between gap-2 p-3 text-right sm:gap-4 sm:p-6"
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        <HelpCircle
          size={14}
          className={`flex-shrink-0 ${isOpen ? 'text-blue-500' : 'text-[var(--app-text-secondary)]'} transition-colors sm:h-5 sm:w-5`}
        />
        <span
          className={`text-xs font-black uppercase tracking-tighter sm:text-base ${isOpen ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--app-text)]'} transition-colors`}
        >
          {question}
        </span>
      </div>
      <motion.div
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0"
      >
        <ChevronDown
          size={14}
          className={`${isOpen ? 'text-blue-500' : 'text-[var(--app-text-secondary)]'} transition-colors sm:h-5 sm:w-5`}
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
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="overflow-hidden"
        >
          <div className="mx-3 border-t border-[var(--app-border)] px-3 pb-3 pt-2 text-xs font-black uppercase leading-tight tracking-tighter text-[var(--app-text-secondary)] sm:mx-6 sm:px-6 sm:pb-6 sm:pt-5 sm:text-sm sm:leading-relaxed">
            {answer}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
));

FAQItem.displayName = 'FAQItem';

// eslint-disable-next-line max-lines-per-function -- قسم الأسئلة الشائعة كاملاً
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
      className="relative z-10 overflow-hidden px-4 py-32"
      style={{ backgroundColor: 'var(--app-bg)' }}
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          badge="الأسئلة الشائعة"
          title="كل ما تريد معرفته عن نظام الزهراء"
          highlightedWord="الزهراء"
          description="إجابات سريعة على أكثر الأسئلة شيوعاً حول النظام. وإذا لم تجد سؤالك، فريق الدعم جاهز لمساعدتك."
          accent="blue"
        />

        <div className="mx-auto max-w-3xl space-y-4">
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
          className="mt-16 border-t border-[var(--app-border)] pt-8 text-center"
        >
          <p className="text-sm font-medium text-[var(--app-text-secondary)]">
            لم تجد إجابة لسؤالك؟{' '}
            <a
              href={`mailto:${LANDING_CONTACT_EMAIL}`}
              className="font-black text-blue-500 hover:underline"
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
