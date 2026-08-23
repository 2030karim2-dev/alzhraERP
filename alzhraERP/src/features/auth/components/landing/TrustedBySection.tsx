import React from 'react';
import { motion } from 'framer-motion';
import { Award } from 'lucide-react';
import { LANDING_TRUSTED_BY } from '../../landing/landing.constants';

/* eslint-disable max-lines-per-function -- قسم الشركات الموثوقة بصفحة الهبوط */
const TrustedBySection: React.FC = () => {
  const brands = [...LANDING_TRUSTED_BY, ...LANDING_TRUSTED_BY]; // duplicate for seamless loop

  return (
    <section
      className="relative z-10 overflow-hidden border-y py-8 sm:py-10"
      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
    >
      <div className="mx-auto max-w-[1440px]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-6 text-center"
        >
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
            <Award size={14} className="text-blue-600 dark:text-blue-400" />
            موثوق من قبل أكثر من 100 مركز ومحل قطع غيار
          </div>
        </motion.div>

        {/* CSS Marquee */}
        <div className="relative overflow-hidden py-1">
          <div className="landing-marquee-track">
            {brands.map((brand, i) => (
              <div
                key={`trust-${String(i)}`}
                className="mx-1.5 flex-shrink-0 rounded-lg border px-3 py-1.5 shadow-sm sm:mx-3 sm:px-5 sm:py-2.5"
                style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }}
              >
                <span
                  className="select-none whitespace-nowrap text-xs font-bold sm:text-sm"
                  style={{ color: 'var(--app-text-secondary)' }}
                >
                  {brand}
                </span>
              </div>
            ))}
          </div>

          {/* Fade edges */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 sm:w-24"
            style={{ background: 'linear-gradient(to right, var(--app-surface), transparent)' }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 sm:w-24"
            style={{ background: 'linear-gradient(to left, var(--app-surface), transparent)' }}
          />
        </div>
      </div>
    </section>
  );
};

export default TrustedBySection;
