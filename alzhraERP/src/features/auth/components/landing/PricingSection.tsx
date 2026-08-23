import React from 'react';
import { motion } from 'framer-motion';
import { Check, Info } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { LANDING_PRICING_PLANS, LANDING_CONTACT_EMAIL } from '../../landing/landing.constants';
import type { LandingPricingPlan } from '../../landing/landing.constants';

const accentBorderMap: Record<string, string> = {
  blue: 'border-blue-200 dark:border-blue-800/60',
  purple: 'border-purple-200 dark:border-purple-800/60',
  gray: 'border-slate-200 dark:border-slate-800',
};

/* eslint-disable max-lines-per-function -- بطاقة وقسم خطط الأسعار */
const PricingCard: React.FC<{ plan: LandingPricingPlan; index: number; onStart: () => void }> =
  React.memo(({ plan, index, onStart }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className={`relative rounded-xl border bg-[var(--app-surface)] p-4 shadow-sm transition-all sm:p-6 ${
        plan.popular
          ? 'landing-pricing-popular z-10 border-blue-500 shadow-md'
          : accentBorderMap[plan.accent] || accentBorderMap.gray
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-blue-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm sm:text-xs">
          الأكثر رواجاً
        </div>
      )}

      <div className="mb-4 text-center sm:mb-6">
        <h3 className="mb-1 text-sm font-bold text-[var(--app-text)] sm:text-base">{plan.name}</h3>
        <p className="mb-3 text-xs font-normal text-[var(--app-text-secondary)] sm:mb-4">
          {plan.description}
        </p>
        <div className="flex items-baseline justify-center gap-0.5" dir="ltr">
          <span className="text-2xl font-black text-[var(--app-text)] sm:text-3xl">
            {plan.price}
          </span>
          <span className="text-xs font-bold text-[var(--app-text-secondary)] sm:text-sm">$</span>
          <span className="text-xs font-normal text-[var(--app-text-secondary)]">
            /{plan.period}
          </span>
        </div>
      </div>

      <ul className="mb-5 space-y-2 sm:mb-6 sm:space-y-2.5">
        {plan.features.map((feat, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-[var(--app-text-secondary)]">
            <Check size={14} className="mt-0.5 flex-shrink-0 text-emerald-500" />
            <span className="font-medium text-slate-700 dark:text-slate-300">{feat}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          if (plan.id === 'enterprise') {
            window.location.href = `mailto:${LANDING_CONTACT_EMAIL}?subject=استفسار باقة المؤسسات - نظام الزهراء`;
          } else {
            onStart();
          }
        }}
        className={`active:scale-98 w-full rounded-lg py-2 text-xs font-bold transition-colors sm:py-2.5 sm:text-sm ${
          plan.popular
            ? 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
            : 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700'
        }`}
      >
        {plan.ctaText}
      </button>
    </motion.div>
  ));

PricingCard.displayName = 'PricingCard';

interface PricingSectionProps {
  sectionRef?: React.RefObject<HTMLDivElement | null>;
  onStart: () => void;
}

const PricingSection: React.FC<PricingSectionProps> = ({ sectionRef, onStart }) => {
  return (
    <section
      ref={sectionRef}
      className="relative z-10 overflow-hidden px-4 py-12 sm:py-16"
      style={{ backgroundColor: 'var(--app-bg)' }}
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          badge="الباقات والأسعار"
          title="اختر الباقة المناسبة لاحتياجاتك"
          highlightedWord="الباقة المناسبة"
          description="خطط أسعار واضحة ومرنة تناسب جميع أحجام المحلات ومراكز الصيانة."
          accent="blue"
        />

        <div className="mx-auto grid max-w-5xl items-start gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
          {LANDING_PRICING_PLANS.map((plan, i) => (
            <PricingCard key={plan.id} plan={plan} index={i} onStart={onStart} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 flex items-center justify-center gap-1.5 text-center text-xs font-medium text-slate-500 dark:text-slate-400 sm:mt-10"
        >
          <Info size={14} className="flex-shrink-0 text-blue-500" />
          جميع الباقات تشمل تحديثات مجانية ودعماً فنياً مع إمكانية الترقية أو إلغاء الاشتراك في أي
          وقت.
        </motion.div>
      </div>
    </section>
  );
};

export default PricingSection;
