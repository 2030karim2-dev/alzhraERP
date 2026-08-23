import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Zap } from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { LoginForm } from '../LoginForm';
import { RegisterForm } from '../RegisterForm';

interface CTASectionProps {
  sectionRef: React.RefObject<HTMLDivElement | null>;
  authTab: 'login' | 'register';
  onTabChange: (tab: 'login' | 'register') => void;
}

/* eslint-disable max-lines-per-function -- قسم CTA ونماذج تسجيل الدخول والتسجيل */
const CTASection: React.FC<CTASectionProps> = ({ sectionRef, authTab, onTabChange }) => {
  const { dir } = useTranslation();

  return (
    <section
      ref={sectionRef}
      className="relative z-10 overflow-hidden bg-slate-950 px-4 py-12 sm:py-16"
    >
      <div className="mx-auto max-w-[1440px]">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          {/* CTA Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-center lg:text-right"
          >
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-3 inline-block rounded-md bg-blue-600/90 px-2.5 py-1 text-xs font-bold text-white sm:mb-4"
            >
              ابدأ الآن بسهولة
            </motion.span>
            <h2 className="mb-3 text-2xl font-black leading-tight text-white sm:mb-4 sm:text-3xl lg:text-4xl">
              جاهز لتنظيم وإدارة <br />
              <span className="text-blue-400">مبيعاتك ومخزونك؟</span>
            </h2>
            <p className="mb-5 text-xs font-normal leading-relaxed text-slate-300 sm:mb-6 sm:text-sm">
              انضم إلى مئات أصحاب مراكز ومحلات قطع الغيار الذين يعتمدون على نظام الزهراء لتشغيل
              أعمالهم اليومية بدقة وسرعة.
            </p>

            <div className="flex flex-row items-center justify-center gap-3 sm:gap-4 lg:justify-start">
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 sm:p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600/20 text-blue-400">
                  <Shield size={16} />
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white sm:text-sm">آمن وموثوق</div>
                  <div className="text-[10px] text-slate-400">تشفير وحماية للبيانات</div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 sm:p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-600/20 text-emerald-400">
                  <Zap size={16} />
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-white sm:text-sm">سريع وسهل</div>
                  <div className="text-[10px] text-slate-400">استجابة فورية</div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Auth Form Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto w-full max-w-md"
          >
            <div className="relative z-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
              {/* Tab Header */}
              <div className="relative flex border-b border-slate-100 dark:border-slate-800">
                {(['login', 'register'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      onTabChange(tab);
                    }}
                    aria-pressed={authTab === tab}
                    className={`relative z-10 flex-1 py-2.5 text-xs font-bold transition-colors sm:py-3 sm:text-sm ${
                      authTab === tab
                        ? 'bg-blue-50/70 text-blue-600 dark:bg-slate-800/70 dark:text-blue-400'
                        : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab === 'login' ? 'دخول' : 'تسجيل'}
                  </button>
                ))}
                <motion.div
                  layoutId="auth-pill"
                  className="absolute bottom-0 h-0.5 bg-blue-600"
                  style={{ width: '50%' }}
                  animate={{
                    [dir === 'rtl' ? 'right' : 'left']: authTab === 'login' ? '0%' : '50%',
                  }}
                />
              </div>

              <div className="p-5 sm:p-6">
                <AnimatePresence mode="wait">
                  {authTab === 'login' ? (
                    <motion.div
                      key="login"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <LoginForm />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="register"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <RegisterForm
                        onSuccess={() => {
                          onTabChange('login');
                        }}
                      />
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
