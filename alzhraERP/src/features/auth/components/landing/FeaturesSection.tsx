import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { SectionHeader } from '../SectionHeader';
import { LANDING_FEATURES, FEATURE_COLORS } from '../../landing/landing.constants';

interface FeaturesSectionProps {
  sectionRef: React.RefObject<HTMLDivElement | null>;
}

/* eslint-disable max-lines-per-function -- بطاقات الميزات بصفحة الهبوط */
const FeaturesSection: React.FC<FeaturesSectionProps> = ({ sectionRef }) => {
  const { dir } = useTranslation();
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section
      ref={sectionRef}
      className="relative z-10 overflow-hidden px-4 py-12 sm:py-16"
      style={{ backgroundColor: 'var(--app-bg)' }}
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          badge="ميزات متقدمة"
          title="كل ما تحتاجه لإدارة تجارتك باحترافية"
          highlightedWord="إدارة تجارتك"
          description="أدوات صممت خصيصاً لتغطية تفاصيل إدارة محلات ومخازن قطع الغيار بأعلى كفاءة."
        />

        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {LANDING_FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="landing-feature-card group cursor-default rounded-xl border bg-[var(--app-surface)] p-4 shadow-sm transition-all hover:shadow-md sm:p-5"
              style={{ borderColor: 'var(--app-border)' }}
            >
              <div
                className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg sm:mb-4 sm:h-10 sm:w-10 ${FEATURE_COLORS.get(feature.color) ?? FEATURE_COLORS.get('blue') ?? ''}`}
              >
                <feature.icon size={18} className="sm:h-5 sm:w-5" />
              </div>
              <h3
                className="mb-1.5 text-sm font-bold sm:text-base"
                style={{ color: 'var(--app-text)' }}
              >
                {feature.title}
              </h3>
              <p className="text-xs font-normal leading-relaxed text-[var(--app-text-secondary)] sm:text-sm">
                {feature.desc}
              </p>
              <div
                className="mt-3 flex items-center gap-1.5 border-t pt-2.5 text-xs font-bold text-blue-600 dark:text-blue-400 sm:mt-4 sm:pt-3"
                style={{ borderColor: 'var(--app-border)' }}
              >
                اكتشف المزيد <ArrowIcon size={12} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
