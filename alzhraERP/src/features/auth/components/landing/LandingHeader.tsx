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

/* eslint-disable max-lines-per-function -- هيدر وقائمة تنقل صفحة الهبوط */
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
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="fixed left-0 right-0 top-0 z-50 transition-all duration-300"
    >
      <div className="mx-auto max-w-[1440px] px-3 py-2 sm:px-4 sm:py-3">
        <div
          className="landing-glass flex h-14 items-center justify-between rounded-xl bg-white/80 px-4 shadow-sm backdrop-blur-md dark:bg-slate-900/80 sm:h-16 sm:px-6"
          style={{ borderColor: 'var(--app-border)' }}
        >
          <div className="group flex cursor-pointer items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white sm:h-10 sm:w-10">
              <Car size={20} />
            </div>
            <div>
              <span
                className="block text-sm font-black leading-none tracking-tight sm:text-base"
                style={{ color: 'var(--app-text)' }}
              >
                نظام الزهراء
              </span>
              <span className="mt-0.5 block text-[9px] font-bold text-blue-600 dark:text-blue-400 sm:text-[10px]">
                Auto Parts ERP
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-xs font-bold text-slate-600 dark:text-slate-300 sm:text-sm md:flex">
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

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'تفعيل الوضع النهاري' : 'تفعيل الوضع الليلي'}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-100/60 text-slate-600 transition-colors hover:bg-slate-200/60 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-700 sm:h-10 sm:w-10"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              type="button"
              onClick={scrollToRegister}
              aria-label="سجل الآن"
              className="hidden h-9 items-center rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition-colors hover:bg-blue-700 sm:flex sm:h-10 sm:px-5 sm:text-sm"
            >
              سجل الآن
            </button>

            {/* Mobile Menu Toggle */}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              aria-label={mobileMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-100/60 text-slate-600 transition-colors hover:bg-slate-200/60 dark:border-slate-700/80 dark:bg-slate-800/60 dark:text-slate-300 md:hidden"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
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
            className="mx-3 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur-lg dark:border-slate-800 dark:bg-slate-900/95 md:hidden"
          >
            <div className="flex flex-col gap-3 text-xs font-bold text-slate-700 dark:text-slate-300 sm:text-sm">
              {navItems.map(item => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => {
                    setMobileMenuOpen(false);
                    item.action();
                  }}
                  className="rounded-lg p-2 text-right transition-colors hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800"
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  scrollToRegister();
                }}
                className="mt-2 w-full rounded-lg bg-blue-600 py-2.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
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
