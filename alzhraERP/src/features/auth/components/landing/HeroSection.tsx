import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Zap, ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { DashboardMockup, AutoPattern } from '../LandingIllustrations';
import { AnimatedCounter } from '../AnimatedCounter';
import { containerVariants, itemVariants } from './landingAnimations';
import { LANDING_HERO_STATS } from '../../landing/landing.constants';

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
                <AutoPattern className="top-[10%] left-[5%] text-blue-500 opacity-20" />
                <AutoPattern className="bottom-[15%] right-[5%] text-emerald-500 rotate-180 scale-75 opacity-20" />

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
            </div>

            {/* ─── Hero Section ── */}
            <section className="relative pt-24 sm:pt-32 lg:pt-0 pb-16 sm:pb-20 px-4 z-10 lg:flex lg:items-center lg:min-h-screen">
                <div className="max-w-none mx-auto w-full">
                    <div className="grid lg:grid-cols-2 gap-8 sm:gap-16 items-center">
                        {/* Hero Text */}
                        <motion.div
                            variants={containerVariants}
                            initial="hidden"
                            animate="visible"
                            className="text-center lg:text-right"
                        >
                            <motion.div variants={itemVariants} className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-3 sm:py-1 rounded-none bg-blue-600 text-white text-[8px] sm:text-xs font-black mb-4 sm:mb-6 uppercase tracking-tighter">
                                <Zap size={10} fill="currentColor" className="sm:w-3.5 sm:h-3.5" /> حوّل تجارتك إلى الرقمية اليوم
                            </motion.div>

                            <motion.h1
                                variants={itemVariants}
                                className="text-3xl sm:text-6xl lg:text-8xl font-black leading-tight sm:leading-[1.05] mb-4 sm:mb-8 tracking-tighter" style={{ color: 'var(--app-text)' }}
                            >
                                أحدث تقنيات <br />
                                <span className="bg-gradient-to-l from-blue-700 via-blue-500 to-emerald-500 bg-clip-text text-transparent drop-shadow-sm">
                                    إدارة قطع الغيار
                                </span>
                            </motion.h1>

                            <motion.p variants={itemVariants} className="text-xs sm:text-lg text-gray-500 dark:text-slate-400 mb-6 sm:mb-10 max-w-md sm:max-w-xl mx-auto lg:mx-0 leading-relaxed font-black uppercase tracking-tight">
                                نظام الزهراء هو الحل السحابي المتكامل لإدارة المخازن، المبيعات، والعملاء لمحلات قطع غيار السيارات. سرعة، دقة، وسهولة في الاستخدام.
                            </motion.p>

                            <motion.div variants={itemVariants} className="flex flex-row items-center gap-2 sm:gap-5 justify-center lg:justify-start">
                                <button
                                    onClick={scrollToAuth}
                                    className="flex-1 sm:flex-none px-4 py-3 sm:px-10 sm:py-5 bg-blue-600 text-white rounded-none font-black flex items-center justify-center gap-2 text-[10px] sm:text-lg shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 border border-white/10"
                                >
                                    ابدأ الآن
                                    <ArrowIcon size={14} className="sm:w-5 sm:h-5" />
                                </button>
                                <button
                                    onClick={scrollToFeatures}
                                    className="flex-1 sm:flex-none px-4 py-3 sm:px-10 sm:py-5 bg-white dark:bg-slate-900 text-gray-900 dark:text-white border border-gray-200 dark:border-slate-800 rounded-none font-black hover:border-blue-500 transition-all active:scale-95 shadow-sm text-[10px] sm:text-base"
                                >
                                    المميزات
                                </button>
                            </motion.div>

                            {/* Stats Grid - Micro Square Style */}
                            <motion.div variants={itemVariants} className="mt-8 sm:mt-12 grid grid-cols-3 gap-2 sm:gap-8 border-t border-gray-100 dark:border-slate-800 pt-6 sm:pt-8">
                                {LANDING_HERO_STATS.map((stat) => (
                                    <div key={stat.label} className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md p-2 sm:p-4 border border-gray-100 dark:border-slate-800 rounded-none text-center sm:text-right">
                                        <div className="text-sm sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                                            <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                                        </div>
                                        <div className="text-[7px] sm:text-xs text-gray-400 dark:text-slate-500 font-black uppercase tracking-tighter truncate">{stat.label}</div>
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>

                        {/* Hero Illustration - 3D Animated Asset */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 1.2, ease: 'circOut' }}
                            className="relative flex items-center justify-center"
                        >
                            <div className="relative w-full max-w-[300px] sm:max-w-none">
                                <motion.img 
                                    src="/assets/3d-car-parts.png" 
                                    alt="3D Car Parts"
                                    animate={{ 
                                        y: [0, -20, 0],
                                        rotate: [0, 2, -2, 0]
                                    }}
                                    transition={{ 
                                        duration: 6, 
                                        repeat: Infinity, 
                                        ease: "easeInOut" 
                                    }}
                                    className="relative z-20 w-full drop-shadow-[0_35px_35px_rgba(0,0,0,0.25)]"
                                />
                                
                                {/* Floating 3D Engine as a secondary detail for larger screens */}
                                <motion.img 
                                    src="/assets/3d-engine.png" 
                                    alt="3D Engine"
                                    animate={{ 
                                        y: [0, 15, 0],
                                        rotate: [0, -5, 5, 0],
                                        scale: [1, 1.05, 1]
                                    }}
                                    transition={{ 
                                        duration: 8, 
                                        repeat: Infinity, 
                                        ease: "easeInOut",
                                        delay: 1
                                    }}
                                    className="absolute -top-10 -right-10 w-24 sm:w-48 z-10 opacity-40 blur-[1px] hidden sm:block"
                                />

                                {/* Decorative Background Elements */}
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-500/10 blur-[80px] rounded-full z-0" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-emerald-500/5 blur-[60px] rounded-full z-0" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>
        </>
    );
};

export default HeroSection;
