import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { SectionHeader } from '../SectionHeader';
import { LANDING_FEATURES, FEATURE_COLORS } from '../../landing/landing.constants';

interface FeaturesSectionProps {
    sectionRef: React.RefObject<HTMLDivElement | null>;
}

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ sectionRef }) => {
    const { dir } = useTranslation();
    const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

    return (
        <section ref={sectionRef} className="relative py-32 px-4 z-10 overflow-hidden" style={{ backgroundColor: 'var(--app-bg)' }}>
            <div className="max-w-none mx-auto">
                <SectionHeader
                    badge="ميزات متقدمة"
                    title="كل ما تحتاجه لإدارة تجارتك باحترافية"
                    highlightedWord="إدارة تجارتك"
                    description="لقد بنينا نظام الزهراء ليكون المساعد الأول لك في عملك اليومي، مع أدوات تغطي أدق تفاصيل إدارة محلك."
                />

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {LANDING_FEATURES.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            whileHover={{ y: -10 }}
                            className="landing-feature-card group bg-[var(--app-surface)] p-4 sm:p-8 rounded-none border shadow-xl shadow-gray-200/20 dark:shadow-black/20 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-default"
                            style={{ borderColor: 'var(--app-border)' }}
                        >
                            <div className={`landing-feature-icon w-10 h-10 sm:w-16 sm:h-16 rounded-none mb-4 sm:mb-8 flex items-center justify-center shadow-sm ${FEATURE_COLORS[feature.color] || FEATURE_COLORS.blue}`}>
                                <feature.icon size={18} className="sm:w-7 sm:h-7" />
                            </div>
                            <h3 className="text-sm sm:text-2xl font-black mb-2 sm:mb-4 tracking-tighter uppercase" style={{ color: 'var(--app-text)' }}>{feature.title}</h3>
                            <p className="text-[10px] sm:text-base text-[var(--app-text-secondary)] leading-tight sm:leading-relaxed font-black uppercase tracking-tighter">{feature.desc}</p>
                            <div className="mt-4 sm:mt-8 pt-3 sm:pt-6 border-t opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center gap-2 text-[9px] sm:text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest" style={{ borderColor: 'var(--app-border)' }}>
                                اكتشف المزيد <ArrowIcon size={12} className="sm:w-4 sm:h-4" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
