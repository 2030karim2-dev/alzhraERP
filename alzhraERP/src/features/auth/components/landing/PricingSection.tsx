import React from 'react';
import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import { SectionHeader } from '../SectionHeader';
import { LANDING_PRICING_PLANS } from '../../landing/landing.constants';
import type { LandingPricingPlan } from '../../landing/landing.constants';

const accentBorderMap: Record<string, string> = {
    blue: 'border-blue-200 dark:border-blue-800',
    purple: 'border-purple-200 dark:border-purple-800',
    gray: 'border-gray-200 dark:border-slate-700',
};

const accentBtnMap: Record<string, string> = {
    blue: 'landing-btn-primary',
    purple: 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40',
    gray: 'bg-[var(--app-surface)] text-[var(--app-text)] border-2 border-[var(--app-border)] hover:border-blue-400 hover:text-blue-600',
};

const PricingCard: React.FC<{ plan: LandingPricingPlan; index: number }> = React.memo(({ plan, index }) => (
    <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.15 }}
        whileHover={{ y: -8 }}
        className={`relative bg-[var(--app-surface)] rounded-none p-4 sm:p-10 border shadow-xl transition-all ${
            plan.popular
                ? 'landing-pricing-popular border-blue-500 shadow-blue-500/10 scale-105 z-10'
                : `${accentBorderMap[plan.accent] || accentBorderMap.gray} shadow-gray-200/10 dark:shadow-black/10`
        }`}
    >
        {plan.popular && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white text-[7px] sm:text-xs font-black rounded-none shadow-lg shadow-blue-500/30 whitespace-nowrap uppercase tracking-tighter">
                <Sparkles size={8} className="sm:w-3 sm:h-3" /> الأكثر رواجاً
            </div>
        )}

        <div className="text-center mb-4 sm:mb-8">
            <h3 className="text-sm sm:text-xl font-black text-[var(--app-text)] mb-1 sm:mb-2 uppercase tracking-tighter">{plan.name}</h3>
            <p className="text-[9px] sm:text-sm text-[var(--app-text-secondary)] mb-3 sm:mb-6 font-black uppercase tracking-tighter">{plan.description}</p>
            <div className="flex items-baseline justify-center gap-1" dir="ltr">
                <span className="text-2xl sm:text-5xl font-black text-[var(--app-text)]">{plan.price}</span>
                <span className="text-xs sm:text-lg text-[var(--app-text-secondary)] font-bold">$</span>
                <span className="text-[8px] sm:text-sm font-black text-[var(--app-text-secondary)] uppercase tracking-tighter">/{plan.period}</span>
            </div>
        </div>

        <ul className="space-y-2 sm:space-y-4 mb-6 sm:mb-10">
            {plan.features.map((feat, i) => (
                <li key={i} className="flex items-start gap-2 text-[9px] sm:text-sm text-[var(--app-text-secondary)]">
                    <Check size={10} className="text-emerald-500 flex-shrink-0 mt-0.5 sm:w-4 sm:h-4" />
                    <span className="font-black uppercase tracking-tighter">{feat}</span>
                </li>
            ))}
        </ul>

        <button
            onClick={() => plan.id === 'enterprise' ? window.location.href = 'mailto:2030.krim2@gmail.com?subject=استفسار باقة المؤسسات - نظام الزهراء' : undefined}
            className={`w-full py-2 sm:py-4 rounded-none font-black text-[10px] sm:text-sm transition-all active:scale-95 uppercase tracking-widest ${
                plan.popular
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700'
                    : 'bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800'
            }`}
        >
            {plan.ctaText}
        </button>
    </motion.div>
));

PricingCard.displayName = 'PricingCard';

const PricingSection: React.FC<{ sectionRef?: React.RefObject<HTMLDivElement | null> }> = ({ sectionRef }) => {
    return (
        <section ref={sectionRef} className="relative py-32 px-4 z-10 overflow-hidden" style={{ backgroundColor: 'var(--app-bg)' }}>
            <div className="max-w-none mx-auto">
                <SectionHeader
                    badge="الباقات والأسعار"
                    title="اختر الباقة المناسبة لاحتياجاتك"
                    highlightedWord="الباقة المناسبة"
                    description="نقدم خطط أسعار مرنة تناسب جميع أحجام المحلات، من الصغيرة وحتى المؤسسات الكبيرة متعددة الفروع."
                    accent="blue"
                />

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10 max-w-6xl mx-auto items-start">
                    {LANDING_PRICING_PLANS.map((plan, i) => (
                        <PricingCard key={plan.id} plan={plan} index={i} />
                    ))}
                </div>

                <motion.p
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="text-center mt-14 text-sm text-[var(--app-text-secondary)] font-medium"
                >
                    💡 جميع الباقات تشمل تحديثات مجانية ودعماً فنياً. يمكنك الترقية أو إلغاء الاشتراك في أي وقت.
                </motion.p>
            </div>
        </section>
    );
};

export default PricingSection;
