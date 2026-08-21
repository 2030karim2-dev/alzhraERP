import React, { useState } from 'react';
import { Car, Globe, Mail, Users, Heart, CheckCircle } from 'lucide-react';
import { LANDING_CONTACT_EMAIL } from '../../landing/landing.constants';

interface LandingFooterProps {
  scrollToFeatures: () => void;
  scrollToHowItWorks: () => void;
  scrollToAuth: () => void;
  scrollToPricing: () => void;
  scrollToFAQ: () => void;
}

/* eslint-disable max-lines-per-function -- مكون الفوتر يحتوي 4 أعمدة كاملة والنشرة البريدية */
const LandingFooter: React.FC<LandingFooterProps> = ({
  scrollToFeatures,
  scrollToHowItWorks,
  scrollToAuth,
  scrollToPricing,
  scrollToFAQ,
}) => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.SyntheticEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const value = email.trim();
    if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return;
    setSubscribed(true);
    setEmail('');
  };

  return (
    <footer className="relative overflow-hidden border-t border-slate-900 bg-slate-950 pb-12 pt-32">
      <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-slate-800 to-transparent" />

      <div className="mx-auto max-w-[1440px] px-4">
        <div className="mb-24 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-16">
          <div className="lg:col-span-1">
            <div className="mb-8 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30">
                <Car className="text-white" size={26} />
              </div>
              <div>
                <span className="block text-xl font-black leading-none tracking-tight text-white">
                  نظام الزهراء
                </span>
                <span className="mt-1 block text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
                  Auto Parts ERP
                </span>
              </div>
            </div>
            <p className="mb-10 text-base font-medium leading-relaxed text-slate-500">
              المنصة العربية الرائدة في إدارة محلات ومراكز صيانة السيارات. نوفر حلولاً عالمية لتبسيط
              عملياتكم وزيادة أرباحكم.
              <br />
              <span className="mt-2 block text-blue-400">الجمهورية اليمنية - المهرة</span>
            </p>
            <div className="flex gap-4">
              {[
                {
                  icon: Globe,
                  label: 'زيارة الموقع التعريفي',
                  href: 'https://alzahra-erp.app',
                  external: true,
                },
                {
                  icon: Mail,
                  label: 'إرسال بريد إلكتروني',
                  href: `mailto:${LANDING_CONTACT_EMAIL}`,
                  external: false,
                },
                {
                  icon: Users,
                  label: 'التواصل مع فريق الدعم',
                  href: `mailto:${LANDING_CONTACT_EMAIL}?subject=دعم%20نظام%20الزهراء`,
                  external: false,
                },
              ].map(({ icon: Icon, label, href, external }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="group flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-500 shadow-sm transition-all hover:border-blue-500/30 hover:text-blue-400"
                >
                  <Icon size={18} className="transition-transform group-hover:scale-110" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-8 text-lg font-black uppercase tracking-tight text-white lg:mb-10">
              الروابط السريعة
            </h4>
            <ul className="space-y-4 font-medium text-slate-500 lg:space-y-5">
              <li>
                <button
                  type="button"
                  onClick={scrollToFeatures}
                  className="transition-colors hover:text-blue-400"
                >
                  الميزات الرئيسية
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={scrollToHowItWorks}
                  className="transition-colors hover:text-blue-400"
                >
                  كيفية الاستخدام
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={scrollToAuth}
                  className="transition-colors hover:text-blue-400"
                >
                  تسجيل الدخول
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={scrollToPricing}
                  className="transition-colors hover:text-blue-400"
                >
                  الأسعار والباقات
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-8 text-lg font-black uppercase tracking-tight text-white lg:mb-10">
              الدعم والمساعدة
            </h4>
            <ul className="space-y-4 font-medium text-slate-500 lg:space-y-5">
              <li>
                <button
                  type="button"
                  onClick={scrollToFAQ}
                  className="transition-colors hover:text-blue-400"
                >
                  الأسئلة الشائعة
                </button>
              </li>
              <li>
                <a
                  href={`mailto:${LANDING_CONTACT_EMAIL}?subject=سياسة الخصوصية%20-%20نظام%20الزهراء`}
                  className="transition-colors hover:text-blue-400"
                >
                  سياسة الخصوصية
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${LANDING_CONTACT_EMAIL}?subject=شروط الاستخدام%20-%20نظام%20الزهراء`}
                  className="transition-colors hover:text-blue-400"
                >
                  شروط الاستخدام
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${LANDING_CONTACT_EMAIL}`}
                  className="transition-colors hover:text-blue-400"
                >
                  اتصل بنا
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-8 text-lg font-black uppercase tracking-tight text-white lg:mb-10">
              النشرة البريدية
            </h4>
            <p className="mb-8 font-medium text-slate-500">
              اشترك لتصلك أحدث الميزات والتحديثات الدورية بنظامنا.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm font-black text-emerald-400">
                <CheckCircle size={18} className="flex-shrink-0" />
                تم الاشتراك بنجاح! شكراً لانضمامك.
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="relative" noValidate>
                <input
                  type="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                  }}
                  autoComplete="email"
                  aria-label="البريد الإلكتروني للنشرة البريدية"
                  dir="ltr"
                  required
                  className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-6 py-4 text-white shadow-inner outline-none transition-all placeholder:text-slate-700 focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  aria-label="الاشتراك في النشرة البريدية"
                  className="absolute bottom-2 top-2 rounded-xl bg-blue-600 px-6 text-sm font-black text-white shadow-lg shadow-blue-600/20 transition-colors hover:bg-blue-700 ltr:left-2 rtl:right-2"
                >
                  اشترك
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-8 border-t border-slate-900/50 pt-10 md:flex-row">
          <p className="text-sm font-bold text-slate-600">
            © {new Date().getFullYear()} نظام الزهراء. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-3 rounded-full border border-slate-900 bg-slate-900/50 px-6 py-3 text-sm font-bold text-slate-600">
            صنع بكل <Heart size={16} className="animate-pulse fill-rose-500 text-rose-500" />{' '}
            لمستقبل أذكى
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
