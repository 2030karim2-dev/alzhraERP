import React from 'react';
import { motion } from 'framer-motion';
import { SectionHeader } from '../SectionHeader';
import { StepIllustration } from '../LandingIllustrations';
import { LANDING_STEPS } from '../../landing/landing.constants';

interface HowItWorksSectionProps {
  sectionRef: React.RefObject<HTMLDivElement | null>;
}

// eslint-disable-next-line max-lines-per-function -- قسم خطوات البداية
const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ sectionRef }) => {
  return (
    <section
      ref={sectionRef}
      className="relative z-10 overflow-hidden px-4 py-32"
      style={{ backgroundColor: 'var(--app-surface)' }}
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          badge="خطوات بسيطة"
          title="ابدأ العمل خلال دقائق معدودة"
          highlightedWord="دقائق"
          description="لقد صممنا النظام ليكون سهلاً للغاية، لا يحتاج لتدريب طويل، فقط اتبع هذه الخطوات."
          accent="emerald"
        />

        <div className="relative">
          {/* Connection Line */}
          <div className="absolute left-1/2 top-[120px] hidden h-0.5 w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-blue-200 to-transparent dark:via-blue-800 lg:block" />

          <div className="relative z-10 grid gap-12 lg:grid-cols-3">
            {LANDING_STEPS.map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.2 }}
                className="group relative"
              >
                <div
                  className="landing-feature-card rounded-[2.5rem] border bg-[var(--app-bg)] p-10 text-center shadow-xl shadow-gray-200/20 transition-all hover:shadow-2xl hover:shadow-blue-500/10 dark:shadow-black/20"
                  style={{ borderColor: 'var(--app-border)' }}
                >
                  <div className="mx-auto mb-10 h-24 w-24 rounded-3xl bg-blue-50 p-4 shadow-inner transition-transform duration-500 group-hover:rotate-3 group-hover:scale-110 dark:bg-blue-900/20">
                    <StepIllustration step={item.step} />
                  </div>
                  <div className="mb-6 inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-black text-white shadow-lg shadow-blue-500/40">
                    {item.step}
                  </div>
                  <h3
                    className="mb-4 text-2xl font-black tracking-tighter"
                    style={{ color: 'var(--app-text)' }}
                  >
                    {item.title}
                  </h3>
                  <p className="font-medium leading-relaxed text-[var(--app-text-secondary)]">
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
