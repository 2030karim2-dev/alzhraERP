import React from 'react';
import { motion } from 'framer-motion';
import { SectionHeader } from '../SectionHeader';
import { StepIllustration } from '../LandingIllustrations';

interface HowItWorksSectionProps {
    sectionRef: React.RefObject<HTMLDivElement | null>;
}

const steps = [
    { step: 1, title: 'أنشئ حسابك', desc: 'سجل بيانات محلك واختر الثيم المناسب لهويتك التجارية في ثوانٍ معدودة.' },
    { step: 2, title: 'أدخل مخزونك', desc: 'ارفع ملفات الإكسيل الخاصة بقطع الغيار أو ابدأ الإدخال بالباركود الذكي.' },
    { step: 3, title: 'ابدأ البيع', desc: 'أصدر فواتيرك الاحترافية وتابع مبيعاتك لحظة بلحظة من أي جهاز.' },
];

const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ sectionRef }) => {
    return (
        <section ref={sectionRef} className="relative py-32 px-4 z-10 overflow-hidden">
            <div className="max-w-none mx-auto">
                <SectionHeader
                    badge="خطوات بسيطة"
                    title="ابدأ العمل خلال دقائق معدودة"
                    description="لقد صممنا النظام ليكون سهلاً للغاية، لا يحتاج لتدريب طويل، فقط اتبع هذه الخطوات."
                />

                <div className="relative">
                    {/* Connection Line */}
                    <div className="hidden lg:block absolute top-[120px] left-1/2 -translate-x-1/2 w-[70%] h-0.5 bg-gradient-to-r from-transparent via-blue-200 dark:via-blue-800 to-transparent" />

                    <div className="grid lg:grid-cols-3 gap-12 relative z-10">
                        {steps.map((item, i) => (
                            <motion.div
                                key={item.step}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: i * 0.2 }}
                                className="relative group"
                            >
                                <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/20 dark:shadow-black/20 hover:shadow-2xl hover:shadow-blue-500/10 transition-all text-center">
                                    <div className="w-24 h-24 mx-auto mb-10 bg-blue-50 dark:bg-blue-900/20 rounded-3xl p-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 shadow-inner">
                                        <StepIllustration step={item.step} />
                                    </div>
                                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-black text-sm mb-6 shadow-lg shadow-blue-500/40">
                                        {item.step}
                                    </div>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">{item.title}</h3>
                                    <p className="text-gray-500 dark:text-slate-400 leading-relaxed font-medium">{item.desc}</p>
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
