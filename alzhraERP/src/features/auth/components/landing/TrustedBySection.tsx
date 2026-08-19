import React from 'react';
import { motion } from 'framer-motion';
import { Star, Award } from 'lucide-react';
import { LANDING_TRUSTED_BY } from '../../landing/landing.constants';

// eslint-disable-next-line max-lines-per-function -- قسم الشعارات المتحركة
const TrustedBySection: React.FC = () => {
  const brands = [...LANDING_TRUSTED_BY, ...LANDING_TRUSTED_BY]; // duplicate for seamless loop

  return (
    <section
      className="relative z-10 overflow-hidden border-y py-20"
      style={{ backgroundColor: 'var(--app-surface)', borderColor: 'var(--app-border)' }}
    >
      <div className="mx-auto max-w-[1440px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <div
            className="mb-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em]"
            style={{ color: 'var(--app-text-secondary)' }}
          >
            <Award size={16} className="text-amber-500" />
            موثوق من قبل +100 مركز ومحل
            <Star size={16} className="text-amber-500" />
          </div>
        </motion.div>

        {/* CSS Marquee */}
        <div className="relative overflow-hidden py-4">
          <div className="landing-marquee-track">
            {brands.map((brand, i) => (
              <div
                key={`trust-${String(i)}`}
                className="mx-2 flex-shrink-0 rounded-lg border px-4 py-2 shadow-sm transition-shadow hover:shadow-md sm:mx-4 sm:px-8 sm:py-4"
                style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--app-border)' }}
              >
                <span
                  className="select-none whitespace-nowrap text-xs font-black uppercase tracking-tighter sm:text-lg"
                  style={{ color: 'var(--app-text-secondary)' }}
                >
                  {brand}
                </span>
              </div>
            ))}
          </div>

          {/* Fade edges */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24"
            style={{ background: 'linear-gradient(to right, var(--app-surface), transparent)' }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24"
            style={{ background: 'linear-gradient(to left, var(--app-surface), transparent)' }}
          />
        </div>
      </div>
    </section>
  );
};

export default TrustedBySection;
