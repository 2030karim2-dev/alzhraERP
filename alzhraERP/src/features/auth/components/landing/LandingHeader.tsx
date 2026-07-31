import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Sun, Moon, Menu, X } from 'lucide-react';
import { useThemeStore } from '../../../../lib/themeStore';

interface LandingHeaderProps {
    scrollToAuth: () => void;
    scrollToFeatures: () => void;
    scrollToHowItWorks: () => void;
}

const LandingHeader: React.FC<LandingHeaderProps> = ({ scrollToAuth, scrollToFeatures, scrollToHowItWorks }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { theme, toggleTheme } = useThemeStore();

    const navItems = [
        { label: 'الميزات', action: scrollToFeatures },
        { label: 'كيف يعمل', action: scrollToHowItWorks },
        { label: 'الأسعار', action: () => {} },
        { label: 'الدخول', action: scrollToAuth },
    ];

    return (
        <motion.nav
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "circOut" }}
            className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        >
            <div className="max-w-none mx-auto px-4 py-6">
                <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border border-white/20 dark:border-slate-800/50 rounded-[2rem] shadow-2xl shadow-blue-500/5 px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4 group cursor-pointer">
                        <motion.div
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.5 }}
                            className="w-12 h-12 bg-gradient-to-tr from-blue-700 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30"
                        >
                            <Car className="text-white" size={26} />
                        </motion.div>
                        <div className="hidden sm:block">
                            <span className="block text-lg font-black text-gray-900 dark:text-white leading-none tracking-tight">نظام الزهراء</span>
                            <span className="block text-[10px] text-blue-500 dark:text-blue-400 uppercase tracking-[0.2em] font-black mt-1">Auto Parts ERP</span>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-10 text-sm font-black text-gray-500 dark:text-slate-400">
                        {navItems.map((item) => (
                            <button
                                key={item.label}
                                onClick={item.action}
                                className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors relative group"
                            >
                                {item.label}
                                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full" />
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2 sm:gap-4">
                        <button
                            onClick={toggleTheme}
                            aria-label={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
                            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gray-100/50 dark:bg-slate-800/50 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-all border border-transparent hover:border-gray-200 dark:hover:border-slate-600 shadow-sm"
                        >
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={scrollToAuth}
                            aria-label="سجل الآن"
                            className="hidden sm:flex px-6 sm:px-8 h-10 sm:h-11 bg-blue-600 text-white rounded-2xl text-sm font-black shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all border border-blue-400/20 items-center"
                        >
                            سجل الآن
                        </motion.button>

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
                            className="md:hidden w-10 h-10 rounded-2xl bg-gray-100/50 dark:bg-slate-800/50 flex items-center justify-center text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm"
                        >
                            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl border-b border-gray-100 dark:border-slate-800 mt-2 mx-4 rounded-3xl overflow-hidden shadow-2xl"
                    >
                        <div className="p-6 flex flex-col gap-6 font-black text-gray-600 dark:text-slate-400">
                            {navItems.map((item) => (
                                <button
                                    key={item.label}
                                    onClick={() => {
                                        setMobileMenuOpen(false);
                                        item.action();
                                    }}
                                    className="text-right hover:text-blue-600 transition-colors"
                                >
                                    {item.label}
                                </button>
                            ))}
                            <button
                                onClick={() => {
                                    setMobileMenuOpen(false);
                                    scrollToAuth();
                                }}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20"
                            >
                                ابدأ الآن مجاناً
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    );
};

export default LandingHeader;
