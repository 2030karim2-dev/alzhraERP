import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { LANDING_PRICING_PLANS, LANDING_CONTACT_EMAIL } from '../../landing/landing.constants';
import type { LandingPricingPlan } from '../../landing/landing.constants';

const accentBorderMap: Record<string, string> = {
  blue: 'border-blue-200 dark:border-blue-800',
  purple: 'border-purple-200 dark:border-purple-800',
  gray: 'border-gray-200 dark:border-slate-700',
};

/* eslint-disable max-lines-per-function -- بطاقة سعر كاملة بقوائم المزايا */
const PricingCard: React.FC<{ plan: LandingPricingPlan; index: number; onStart: () => void }> =
  React.memo(({ plan, index, onStart }) => (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.15 }}
      whileHover={{ y: -8 }}
      className={`relative rounded-2xl border bg-[var(--app-surface)] p-4 shadow-xl transition-all sm:p-10 ${
        plan.popular
          ? 'landing-pricing-popular z-10 scale-105 border-blue-500 shadow-blue-500/10'
          : `${accentBorderMap[plan.accent] || accentBorderMap.gray} shadow-gray-200/10 dark:shadow-black/10`
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-2 left-1/2 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black uppercase tracking-tighter text-white shadow-lg shadow-blue-500/30 sm:text-xs">
          <Sparkles size={8} className="sm:h-3 sm:w-3" /> الأكثر رواجاً
        </div>
      )}

      <div className="mb-4 text-center sm:mb-8">
        <h3 className="mb-1 text-base font-black uppercase tracking-tighter text-[var(--app-text)] sm:mb-2 sm:text-xl">
          {plan.name}
        </h3>
        <p className="mb-3 text-xs font-black uppercase tracking-tighter text-[var(--app-text-secondary)] sm:mb-6 sm:text-sm">
          {plan.description}
        </p>
        <div className="flex items-baseline justify-center gap-1" dir="ltr">
          <span className="text-2xl font-black text-[var(--app-text)] sm:text-5xl">
            {plan.price}
          </span>
          <span className="text-xs font-bold text-[var(--app-text-secondary)] sm:text-lg">$</span>
          <span className="text-[10px] font-black uppercase tracking-tighter text-[var(--app-text-secondary)] sm:text-sm">
            /{plan.period}
          </span>
        </div>
      </div>

      <ul className="mb-6 space-y-2 sm:mb-10 sm:space-y-4">
        {plan.features.map((feat, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-xs text-[var(--app-text-secondary)] sm:text-sm"
          >
            <Check size={10} className="mt-0.5 flex-shrink-0 text-emerald-500 sm:h-4 sm:w-4" />
            <span className="font-black uppercase tracking-tighter">{feat}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          if (plan.id === 'enterprise') {
            window.location.href =
              `mailto:${LANDING_CONTACT_EMAIL}?subject=استفسار باقة المؤسسات - نظام الزهراء`;
          } else {
            onStart();
          }
        }}
        className={`w-full rounded-xl py-2 text-xs font-black uppercase tracking-widest transition-all active:scale-95 sm:py-4 sm:text-sm ${
          plan.popular
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700'
            : 'border border-gray-200 bg-white text-gray-900 dark:border-slate-800 dark:bg-slate-900 dark:text-white'
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
      className="relative z-10 overflow-hidden px-4 py-32"
      style={{ backgroundColor: 'var(--app-bg)' }}
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          badge="الباقات والأسعار"
          title="اختر الباقة المناسبة لاحتياجاتك"
          highlightedWord="الباقة المناسبة"
          description="نقدم خطط أسعار مرنة تناسب جميع أحجام المحلات، من الصغيرة وحتى المؤسسات الكبيرة متعددة الفروع."
          accent="blue"
        />

        <div className="mx-auto grid max-w-6xl items-start gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-10">
          {LANDING_PRICING_PLANS.map((plan, i) => (
            <PricingCard key={plan.id} plan={plan} index={i} onStart={onStart} />
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-14 text-center text-sm font-medium text-[var(--app-text-secondary)]"
        >
          💡 جميع الباقات تشمل تحديثات مجانية ودعماً فنياً. يمكنك الترقية أو إلغاء الاشتراك في أي
          وقت.
        </motion.p>
      </div>
    </section>
  );
};

export default PricingSection;
