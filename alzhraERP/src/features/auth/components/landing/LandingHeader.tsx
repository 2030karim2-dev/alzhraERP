import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, Sun, Moon, Menu, X } from 'lucide-react';
import { useThemeStore } from '../../../../lib/themeStore';

interface LandingHeaderProps {
  scrollToAuth: () => void;
  scrollToRegister: () => void;
  scrollToFeatures: () => void;
  scrollToHowItWorks: () => void;
  scrollToPricing: () => void;
}

/* eslint-disable max-lines-per-function -- الهيدر يضم التنقل والقائمة المتنقلة وأزرار الثيم */
const LandingHeader: React.FC<LandingHeaderProps> = ({
  scrollToAuth,
  scrollToRegister,
  scrollToFeatures,
  scrollToHowItWorks,
  scrollToPricing,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useThemeStore();

  const navItems = [
    { label: 'الميزات', action: scrollToFeatures },
    { label: 'كيف يعمل', action: scrollToHowItWorks },
    { label: 'الأسعار', action: scrollToPricing },
    { label: 'الدخول', action: scrollToAuth },
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: 'circOut' }}
      className="fixed left-0 right-0 top-0 z-50 transition-all duration-300"
    >
      <div className="mx-auto max-w-[1440px] px-4 py-6">
        <div
          className="landing-glass flex h-20 items-center justify-between rounded-[2rem] bg-white/70 px-6 shadow-2xl shadow-blue-500/5 backdrop-blur-2xl dark:bg-slate-900/70"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <div className="group flex cursor-pointer items-center gap-4">
            <motion.div
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.5 }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-400 shadow-lg shadow-blue-500/30"
            >
              <Car className="text-white" size={26} />
            </motion.div>
            <div className="hidden sm:block">
              <span
                className="block text-lg font-black leading-none tracking-tight"
                style={{ color: 'var(--app-text)' }}
              >
                نظام الزهراء
              </span>
              <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 dark:text-blue-400">
                Auto Parts ERP
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-10 text-sm font-black text-gray-500 dark:text-slate-400 md:flex">
            {navItems.map(item => (
              <button
                type="button"
                key={item.label}
                onClick={item.action}
                className="group relative transition-colors hover:text-blue-600 dark:hover:text-blue-400"
              >
                {item.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-blue-600 transition-all group-hover:w-full" />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-transparent bg-gray-100/50 text-gray-500 shadow-sm transition-all hover:border-gray-200 hover:bg-white dark:bg-slate-800/50 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-700 sm:h-11 sm:w-11"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={scrollToRegister}
              aria-label="سجل الآن"
              className="hidden h-10 items-center rounded-2xl border border-blue-400/20 bg-blue-600 px-6 text-sm font-black text-white shadow-xl shadow-blue-500/30 transition-all hover:bg-blue-700 sm:flex sm:h-11 sm:px-8"
            >
              سجل الآن
            </motion.button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100/50 text-gray-500 shadow-sm transition-all hover:bg-white dark:bg-slate-800/50 dark:text-slate-400 dark:hover:bg-slate-700 md:hidden"
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
            className="mx-4 mt-2 overflow-hidden rounded-3xl border-b border-gray-100 bg-white/90 shadow-2xl backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-900/90 md:hidden"
          >
            <div className="flex flex-col gap-6 p-6 font-black text-gray-600 dark:text-slate-400">
              {navItems.map(item => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    item.action();
                  }}
                  className="text-right transition-colors hover:text-blue-600"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  scrollToRegister();
                }}
                className="w-full rounded-2xl bg-blue-600 py-4 text-white shadow-lg shadow-blue-500/20"
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
