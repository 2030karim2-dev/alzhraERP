import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { LoginForm } from '../LoginForm';
import { RegisterForm } from '../RegisterForm';

interface CTASectionProps {
    sectionRef: React.RefObject<HTMLDivElement | null>;
}

const CTASection: React.FC<CTASectionProps> = ({ sectionRef }) => {
    const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
    const { dir } = useTranslation();

    return (
        <section ref={sectionRef} className="relative py-32 px-4 z-10 bg-slate-900 overflow-hidden">
            {/* Background blobs for CTA */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 blur-[150px]" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-600/10 blur-[150px]" />

            <div className="max-w-none mx-auto">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* CTA Content */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        className="text-center lg:text-right"
                    >
                        <motion.span
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-block px-2 py-0.5 bg-blue-600 text-white text-[7px] sm:text-[10px] font-black uppercase tracking-widest mb-4 sm:mb-8 rounded-none"
                        >
                            انضم إلى المستقبل
                        </motion.span>
                        <h2 className="text-2xl sm:text-7xl font-black text-white leading-tight sm:leading-[1.1] mb-4 sm:mb-8 tracking-tighter uppercase">
                            هل أنت مستعد <br />
                            لتطوير <span className="text-blue-400">تجارتك؟</span>
                        </h2>
                        <p className="text-[10px] sm:text-xl text-slate-400 mb-6 sm:mb-12 leading-tight sm:leading-relaxed font-black uppercase tracking-tighter opacity-80">
                            انضم إلى مئات أصحاب مراكز قطع الغيار الذين يثقون في "نظام الزهراء" لإدارة أعمالهم اليومية بكفاءة واحترافية لا مثيل لها.
                        </p>

                        <div className="flex flex-row items-center gap-2 sm:gap-6 justify-center lg:justify-start">
                            <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur p-2 sm:p-4 rounded-none border border-slate-700/50">
                                <div className="w-6 h-6 sm:w-10 sm:h-10 bg-blue-500/20 text-blue-400 rounded-none flex items-center justify-center">
                                    <Shield size={14} className="sm:w-5 sm:h-5" />
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-black text-[9px] sm:text-sm uppercase tracking-tighter leading-none">آمن تماماً</div>
                                    <div className="text-[7px] sm:text-[10px] text-slate-500 font-black uppercase tracking-tighter mt-0.5">تشفير عسكري</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur p-2 sm:p-4 rounded-none border border-slate-700/50">
                                <div className="w-6 h-6 sm:w-10 sm:h-10 bg-emerald-500/20 text-emerald-400 rounded-none flex items-center justify-center">
                                    <Zap size={14} className="sm:w-5 sm:h-5" />
                                </div>
                                <div className="text-right">
                                    <div className="text-white font-black text-[9px] sm:text-sm uppercase tracking-tighter leading-none">سريع جداً</div>
                                    <div className="text-[7px] sm:text-[10px] text-slate-500 font-black uppercase tracking-tighter mt-0.5">أداء فائق</div>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* Auth Form Container */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="w-full max-w-md mx-auto"
                    >
                        <div className="bg-white dark:bg-slate-900 rounded-none shadow-2xl shadow-blue-900/20 overflow-hidden border border-white dark:border-slate-800 relative z-10">
                            {/* Tab Header */}
                            <div className="flex relative border-b border-gray-100 dark:border-slate-800">
                                {(['login', 'register'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setAuthTab(tab)}
                                        aria-pressed={authTab === tab}
                                        className={`relative flex-1 py-3 sm:py-5 text-[10px] sm:text-sm font-black transition-colors z-10 rounded-none uppercase tracking-widest
                        ${authTab === tab
                                                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-slate-800/70'
                                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'}`}
                                    >
                                        {tab === 'login' ? 'دخول' : 'تسجيل'}
                                    </button>
                                ))}
                                <motion.div
                                    layoutId="auth-pill"
                                    className="absolute bottom-0 h-0.5 bg-blue-500 rounded-full"
                                    style={{ width: '50%' }}
                                    animate={{ [dir === 'rtl' ? 'right' : 'left']: authTab === 'login' ? '0%' : '50%' }}
                                />
                            </div>

                            <div className="p-8 sm:p-10 min-h-[450px]">
                                <AnimatePresence mode="wait">
                                    {authTab === 'login' ? (
                                        <motion.div
                                            key="login"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <LoginForm />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="register"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.3 }}
                                        >
                                            <RegisterForm onSuccess={() => setAuthTab('login')} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};

export default CTASection;
