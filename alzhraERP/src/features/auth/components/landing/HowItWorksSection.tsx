import React from 'react';
import { motion } from 'framer-motion';
import { SectionHeader } from '../SectionHeader';
import { StepIllustration } from '../LandingIllustrations';
import { LANDING_STEPS } from '../../landing/landing.constants';

interface HowItWorksSectionProps {
  sectionRef: React.RefObject<HTMLDivElement | null>;
}

/* eslint-disable max-lines-per-function -- قسم خطوات البدء بصفحة الهبوط */
const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ sectionRef }) => {
  return (
    <section
      ref={sectionRef}
      className="relative z-10 overflow-hidden px-4 py-12 sm:py-16"
      style={{ backgroundColor: 'var(--app-surface)' }}
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          badge="خطوات بسيطة"
          title="ابدأ العمل خلال دقائق معدودة"
          highlightedWord="دقائق"
          description="واجهة سهلة الاستخدام لا تحتاج لتدريب طويل، فقط اتبع هذه الخطوات الثلاث."
          accent="emerald"
        />

        <div className="relative">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            {LANDING_STEPS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group relative"
              >
                <div
                  className="rounded-xl border bg-[var(--app-bg)] p-5 text-center shadow-sm transition-all hover:shadow-md sm:p-6"
                  style={{ borderColor: 'var(--app-border)' }}
                >
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-blue-50 p-2 dark:bg-blue-950/40 sm:h-20 sm:w-20">
                    <StepIllustration step={item.step} />
                  </div>
                  <div className="mb-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm sm:h-8 sm:w-8">
                    {item.step}
                  </div>
                  <h3
                    className="mb-2 text-sm font-bold sm:text-base"
                    style={{ color: 'var(--app-text)' }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs font-normal leading-relaxed text-[var(--app-text-secondary)] sm:text-sm">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
