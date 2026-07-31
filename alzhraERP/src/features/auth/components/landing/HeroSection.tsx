import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Zap, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { DashboardMockup, AutoPattern } from '../LandingIllustrations';
import { AnimatedCounter } from '../AnimatedCounter';
import { containerVariants, itemVariants } from './landingAnimations';

interface HeroSectionProps {
    scrollToAuth: () => void;
    scrollToFeatures: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ scrollToAuth, scrollToFeatures }) => {
    const { dir } = useTranslation();
    const shouldReduceMotion = useReducedMotion();
    const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

    return (
        <>
            {/* ── Background Patterns ── */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.08),transparent_50%)]" />
                <div className="absolute top-0 left-0 w-full h-[800px] bg-gradient-to-b from-blue-50/50 dark:from-blue-900/10 to-transparent" />
                <AutoPattern className="top-[10%] left-[5%] text-blue-500" />
                <AutoPattern className="bottom-[15%] right-[5%] text-emerald-500 rotate-180 scale-75" />

                {/* Dynamic animated blobs */}
                <motion.div
                    animate={shouldReduceMotion ? {} : {
                        x: [0, 50, 0],
                        y: [0, -30, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={shouldReduceMotion ? {} : { duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[15%] right-[5%] w-[600px] h-[600px] bg-blue-400/10 dark:bg-blue-600/5 rounded-full blur-[120px]"
                    style={{ willChange: 'transform' }}
                />
                <motion.div
                    animate={shouldReduceMotion ? {} : {
                        x: [0, -40, 0],
                        y: [0, 60, 0],
                        scale: [1, 0.9, 1]
                    }}
                    transition={shouldReduceMotion ? {} : { duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[10%] left-[5%] w-[500px] h-[500px] bg-emerald-400/10 dark:bg-emerald-600/5 rounded-full blur-[100px]"
                    style={{ willChange: 'transform' }}
                />
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] dark:opacity-[0.02] text-slate-900 dark:text-slate-100 pointer-events-none"
                    style={{
                        backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
                        backgroundSize: '28px 28px'
                    }}
                />
            </div>

            {/* ─── Hero Section ── */}
            <section className="relative pt-32 lg:pt-0 pb-20 px-4 z-10 lg:flex lg:items-center lg:min-h-screen">
                <div className="max-w-none mx-auto w-full">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        {/* Hero Text */}
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="text-center lg:text-right"
                        >
                            <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold mb-6 border border-blue-200/50 dark:border-blue-800/50">
                                <Zap size={14} fill="currentColor" /> حوّل تجارتك إلى الرقمية اليوم
                            </motion.div>

                            <motion.h1
                                variants={itemVariants}
                                className="text-4xl sm:text-6xl lg:text-8xl font-black text-gray-900 dark:text-white leading-[1.05] mb-8 tracking-tighter"
                            >
                                أحدث تقنيات <br />
                                <span className="bg-gradient-to-l from-blue-700 via-blue-500 to-emerald-500 bg-clip-text text-transparent drop-shadow-sm">
                                    إدارة قطع الغيار
                                </span>
                            </motion.h1>

                            <motion.p variants={itemVariants} className="text-lg text-gray-500 dark:text-slate-400 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                                نظام الزهراء هو الحل السحابي المتكامل لإدارة المخازن، المبيعات، والعملاء لمحلات قطع غيار السيارات. سرعة، دقة، وسهولة في الاستخدام.
                            </motion.p>

                            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 justify-center lg:justify-start">
                                <button
                                    onClick={scrollToAuth}
                                    aria-label="ابدأ مجاناً الآن"
                                    className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-2xl font-black flex items-center justify-center gap-3 text-base sm:text-lg shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all active:scale-95 border border-white/10"
                                >
                                    ابدأ مجاناً الآن
                                    <ArrowIcon size={22} />
                                </button>
                                <button
                                    onClick={scrollToFeatures}
                                    aria-label="مشاهدة المميزات"
                                    className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md text-gray-700 dark:text-white border-2 border-gray-100 dark:border-slate-800 rounded-2xl font-black hover:border-blue-500 hover:bg-white dark:hover:bg-slate-900 transition-all active:scale-95 shadow-sm text-sm sm:text-base"
                                >
                                    مشاهدة المميزات
                                </button>
                            </motion.div>

                            {/* Stats Grid */}
                            <motion.div variants={itemVariants} className="mt-12 grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 border-t border-gray-100 dark:border-slate-800 pt-8">
                                {[
                                    { label: 'عميل نشط', value: 1200, suffix: '+' },
                                    { label: 'فاتورة منجزة', value: 45, suffix: 'K+' },
                                    { label: 'قطعة مدارة', value: 250, suffix: 'K+' },
                                ].map((stat, i) => (
                                    <div key={stat.label} className={i === 2 ? "col-span-2 sm:col-span-1" : ""}>
                                        <div className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                                            <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                                        </div>
                                        <div className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-widest">{stat.label}</div>
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>

                        {/* Hero Illustration */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className="relative rounded-[2.5rem] p-4 lg:p-8"
                        >
                            <DashboardMockup className="relative z-10" />
                            {/* Backdrops */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-blue-500/10 blur-[100px] rounded-full z-0" />
                        </motion.div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default HeroSection;
