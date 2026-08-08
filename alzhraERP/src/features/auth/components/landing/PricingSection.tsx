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
        className={`relative bg-[var(--app-surface)] rounded-[2rem] p-8 lg:p-10 border shadow-xl transition-all ${
            plan.popular
                ? 'landing-pricing-popular border-blue-500 shadow-blue-500/10 scale-105 z-10'
                : `${accentBorderMap[plan.accent] || accentBorderMap.gray} shadow-gray-200/10 dark:shadow-black/10`
        }`}
    >
        {plan.popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white text-xs font-black rounded-full shadow-lg shadow-blue-500/30 whitespace-nowrap">
                <Sparkles size={12} /> الأكثر رواجاً
            </div>
        )}

        <div className="text-center mb-8">
            <h3 className="text-xl font-black text-[var(--app-text)] mb-2">{plan.name}</h3>
            <p className="text-sm text-[var(--app-text-secondary)] mb-6">{plan.description}</p>
            <div className="flex items-baseline justify-center gap-1" dir="ltr">
                <span className="text-5xl font-black text-[var(--app-text)]">{plan.price}</span>
                <span className="text-lg text-[var(--app-text-secondary)] font-bold">$</span>
                <span className="text-sm font-medium text-[var(--app-text-secondary)]">/{plan.period}</span>
            </div>
        </div>

        <ul className="space-y-4 mb-10">
            {plan.features.map((feat, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-[var(--app-text-secondary)]">
                    <Check size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                    <span className="font-medium">{feat}</span>
                </li>
            ))}
        </ul>

        <button
            onClick={() => plan.id === 'enterprise' ? window.location.href = 'mailto:2030.krim2@gmail.com?subject=استفسار باقة المؤسسات - نظام الزهراء' : undefined}
            className={`w-full py-4 rounded-2xl font-black text-sm transition-all active:scale-95 ${
                plan.popular
                    ? 'landing-btn-primary'
                    : accentBtnMap[plan.accent] || accentBtnMap.gray
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
