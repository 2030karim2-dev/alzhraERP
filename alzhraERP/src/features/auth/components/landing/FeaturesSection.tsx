import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { SectionHeader } from '../SectionHeader';
import { LANDING_FEATURES, FEATURE_COLORS } from '../../landing/landing.constants';

interface FeaturesSectionProps {
  sectionRef: React.RefObject<HTMLDivElement | null>;
}

// eslint-disable-next-line max-lines-per-function -- قسم الميزات ببطاقاته الست
const FeaturesSection: React.FC<FeaturesSectionProps> = ({ sectionRef }) => {
  const { dir } = useTranslation();
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section
      ref={sectionRef}
      className="relative z-10 overflow-hidden px-4 py-32"
      style={{ backgroundColor: 'var(--app-bg)' }}
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          badge="ميزات متقدمة"
          title="كل ما تحتاجه لإدارة تجارتك باحترافية"
          highlightedWord="إدارة تجارتك"
          description="لقد بنينا نظام الزهراء ليكون المساعد الأول لك في عملك اليومي، مع أدوات تغطي أدق تفاصيل إدارة محلك."
        />

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {LANDING_FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{ y: -10 }}
              className="landing-feature-card group cursor-default rounded-2xl border bg-[var(--app-surface)] p-4 shadow-xl shadow-gray-200/20 transition-all hover:shadow-2xl hover:shadow-blue-500/10 dark:shadow-black/20 sm:p-8"
              style={{ borderColor: 'var(--app-border)' }}
            >
              <div
                className={`landing-feature-icon mb-4 flex h-10 w-10 items-center justify-center rounded-xl shadow-sm sm:mb-8 sm:h-16 sm:w-16 ${FEATURE_COLORS.get(feature.color) ?? FEATURE_COLORS.get('blue') ?? ''}`}
              >
                <feature.icon size={18} className="sm:h-7 sm:w-7" />
              </div>
              <h3
                className="mb-2 text-base font-black uppercase tracking-tighter sm:mb-4 sm:text-2xl"
                style={{ color: 'var(--app-text)' }}
              >
                {feature.title}
              </h3>
              <p className="text-xs font-black uppercase leading-tight tracking-tighter text-[var(--app-text-secondary)] sm:text-base sm:leading-relaxed">
                {feature.desc}
              </p>
              <div
                className="mt-4 flex items-center gap-2 border-t pt-3 text-xs font-black uppercase tracking-widest text-blue-600 opacity-0 transition-opacity duration-500 group-hover:opacity-100 dark:text-blue-400 sm:mt-8 sm:pt-6 sm:text-sm"
                style={{ borderColor: 'var(--app-border)' }}
              >
                اكتشف المزيد <ArrowIcon size={12} className="sm:h-4 sm:w-4" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
