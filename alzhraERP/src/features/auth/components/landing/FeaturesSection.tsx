import React from 'react';
import { motion } from 'framer-motion';
import { Package, FileText, Users, BarChart3, Shield, Zap, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { SectionHeader } from '../SectionHeader';

interface FeaturesSectionProps {
    sectionRef: React.RefObject<HTMLDivElement | null>;
}

const features = [
    {
        icon: Package,
        title: 'إدارة مخزون ذكية',
        desc: 'تتبع كل برغي في مخزنك، مع تنبيهات تلقائية بالأصناف التي أوشكت على النفاد وتقارير بالنقص.',
        color: 'blue'
    },
    {
        icon: FileText,
        title: 'نظام فواتير متطور',
        desc: 'أصدر فواتير ضريبية، فواتير عرض، وفواتير مرتجعات في ثوانٍ معدودة مع دعم كامل للباركود.',
        color: 'emerald'
    },
    {
        icon: Users,
        title: 'إدارة العملاء والموردين',
        desc: 'قاعدة بيانات شاملة لعملائك مع تتبع الحسابات الآجلة والمدفوعات والديون بدقة متناهية.',
        color: 'orange'
    },
    {
        icon: BarChart3,
        title: 'تقارير وشاشات تحليلية',
        desc: 'شاهد نمو مبيعاتك وأرباحك اليومية والشهرية من خلال لوحات بيانات تفاعلية ورسوم بيانية.',
        color: 'purple'
    },
    {
        icon: Shield,
        title: 'أمان عالي ونسخ احتياطي',
        desc: 'بياناتك محفوظة في سحابة مشفرة مع نسخ احتياطي يومي يضمن عدم فقدان أي معلومة أبداً.',
        color: 'indigo'
    },
    {
        icon: Zap,
        title: 'ذكاء اصطناعي مدمج',
        desc: 'مساعد ذكي يحلل بياناتك ويسرع عمليات الإدخال ويقترح عليك الكميات المناسبة للشراء.',
        color: 'amber'
    },
];

const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 shadow-blue-200/50',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 shadow-emerald-200/50',
    orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 shadow-orange-200/50',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 shadow-purple-200/50',
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 shadow-indigo-200/50',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 shadow-amber-200/50',
};

const FeaturesSection: React.FC<FeaturesSectionProps> = ({ sectionRef }) => {
    const { dir } = useTranslation();
    const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

    return (
        <section ref={sectionRef} className="relative py-32 px-4 z-10 bg-gray-50/50 dark:bg-transparent overflow-hidden">
            <div className="max-w-none mx-auto">
                <SectionHeader
                    badge="ميزات متقدمة"
                    title="كل ما تحتاجه لإدارة تجارتك باحترافية"
                    description="لقد بنينا نظام الزهراء ليكون المساعد الأول لك في عملك اليومي، مع أدوات تغطي أدق تفاصيل إدارة محلك."
                />

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, i) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: '-50px' }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                            whileHover={{ y: -10 }}
                            className="group bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-xl shadow-gray-200/20 dark:shadow-black/20 hover:shadow-2xl hover:shadow-blue-500/10 transition-all cursor-default"
                        >
                            <div className={`w-16 h-16 rounded-2xl mb-8 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm ${colorMap[feature.color] || colorMap.blue}`}>
                                <feature.icon size={28} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4 tracking-tighter">{feature.title}</h3>
                            <p className="text-gray-500 dark:text-slate-400 leading-relaxed font-medium text-base">{feature.desc}</p>
                            <div className="mt-8 pt-6 border-t border-gray-50 dark:border-slate-800/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center gap-2 text-sm font-black text-blue-600 dark:text-blue-400">
                                اكتشف المزيد <ArrowIcon size={16} />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
