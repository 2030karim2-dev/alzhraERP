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

/* eslint-disable max-lines-per-function -- قسم CTA يضم المحتوى التسويقي ونموذجي الدخول والتسجيل */
const CTASection: React.FC<CTASectionProps> = ({ sectionRef, authTab, onTabChange }) => {
  const { dir } = useTranslation();

  return (
    <section ref={sectionRef} className="relative z-10 overflow-hidden bg-slate-950 px-4 py-32">
      {/* Background blobs for CTA */}
      <div className="absolute right-0 top-0 h-[600px] w-[600px] bg-blue-600/20 blur-[150px]" />
      <div className="absolute bottom-0 left-0 h-[600px] w-[600px] bg-emerald-600/10 blur-[150px]" />

      <div className="mx-auto max-w-[1440px]">
        <div className="grid items-center gap-16 lg:grid-cols-2">
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
              className="mb-4 inline-block rounded-full bg-blue-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white sm:mb-8 sm:text-xs"
            >
              انضم إلى المستقبل
            </motion.span>
            <h2 className="mb-4 text-3xl font-black uppercase leading-tight tracking-tighter text-white sm:mb-8 sm:text-7xl sm:leading-[1.1]">
              هل أنت مستعد <br />
              لتطوير <span className="text-blue-400">تجارتك؟</span>
            </h2>
            <p className="mb-6 text-xs font-black uppercase leading-tight tracking-tighter text-slate-400 opacity-80 sm:mb-12 sm:text-xl sm:leading-relaxed">
              انضم إلى مئات أصحاب مراكز قطع الغيار الذين يثقون في "نظام الزهراء" لإدارة أعمالهم
              اليومية بكفاءة واحترافية لا مثيل لها.
            </p>

            <div className="flex flex-row items-center justify-center gap-2 sm:gap-6 lg:justify-start">
              <div className="flex items-center gap-2 rounded-none border border-slate-700/50 bg-slate-800/50 p-2 backdrop-blur sm:p-4">
                <div className="flex h-6 w-6 items-center justify-center rounded-none bg-blue-500/20 text-blue-400 sm:h-10 sm:w-10">
                  <Shield size={14} className="sm:h-5 sm:w-5" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-black uppercase leading-none tracking-tighter text-white sm:text-sm">
                    آمن تماماً
                  </div>
                  <div className="mt-0.5 text-[10px] font-black uppercase tracking-tighter text-slate-500 sm:text-xs">
                    تشفير عسكري
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-none border border-slate-700/50 bg-slate-800/50 p-2 backdrop-blur sm:p-4">
                <div className="flex h-6 w-6 items-center justify-center rounded-none bg-emerald-500/20 text-emerald-400 sm:h-10 sm:w-10">
                  <Zap size={14} className="sm:h-5 sm:w-5" />
                </div>
                <div className="text-right">
                  <div className="text-xs font-black uppercase leading-none tracking-tighter text-white sm:text-sm">
                    سريع جداً
                  </div>
                  <div className="mt-0.5 text-[10px] font-black uppercase tracking-tighter text-slate-500 sm:text-xs">
                    أداء فائق
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Auth Form Container */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto w-full max-w-md"
          >
            <div className="relative z-10 overflow-hidden rounded-2xl border border-white bg-white shadow-2xl shadow-blue-900/20 dark:border-slate-700 dark:bg-slate-900">
              {/* Tab Header */}
              <div className="relative flex border-b border-gray-100 dark:border-slate-800">
                {(['login', 'register'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      onTabChange(tab);
                    }}
                    aria-pressed={authTab === tab}
                    className={`relative z-10 flex-1 rounded-none py-3 text-xs font-black uppercase tracking-widest transition-colors sm:py-5 sm:text-sm ${
                      authTab === tab
                        ? 'bg-blue-50/70 text-blue-600 dark:bg-slate-800/70 dark:text-blue-400'
                        : 'text-gray-400 hover:text-gray-600 dark:hover:text-slate-300'
                    }`}
                  >
                    {tab === 'login' ? 'دخول' : 'تسجيل'}
                  </button>
                ))}
                <motion.div
                  layoutId="auth-pill"
                  className="absolute bottom-0 h-0.5 rounded-full bg-blue-500"
                  style={{ width: '50%' }}
                  animate={{
                    [dir === 'rtl' ? 'right' : 'left']: authTab === 'login' ? '0%' : '50%',
                  }}
                />
              </div>

              <div className="min-h-[450px] p-8 sm:p-10">
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
