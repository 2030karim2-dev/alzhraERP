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

/* eslint-disable max-lines-per-function -- فوتر صفحة الهبوط بأعمدته وروابطه */
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
    <footer className="relative overflow-hidden border-t border-slate-900 bg-slate-950 pb-6 pt-10 sm:pt-12">
      <div className="mx-auto max-w-[1440px] px-4">
        <div className="mb-8 grid grid-cols-1 gap-6 sm:mb-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="lg:col-span-1">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
                <Car className="text-white" size={20} />
              </div>
              <div>
                <span className="block text-base font-black leading-none text-white">
                  نظام الزهراء
                </span>
                <span className="mt-0.5 block text-[9px] font-bold text-blue-500">
                  Auto Parts ERP
                </span>
              </div>
            </div>
            <p className="mb-4 text-xs font-normal leading-relaxed text-slate-400">
              المنصة العربية المتخصصة في إدارة محلات ومراكز قطع غيار السيارات.
              <br />
              <span className="mt-1 block text-slate-500">الجمهورية اليمنية - المهرة</span>
            </p>
            <div className="flex gap-2">
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
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition-colors hover:border-blue-500/40 hover:text-blue-400"
                >
                  <Icon size={14} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-xs font-bold text-white sm:text-sm">الروابط السريعة</h4>
            <ul className="space-y-2 text-xs text-slate-400">
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
            <h4 className="mb-3 text-xs font-bold text-white sm:text-sm">الدعم والمساعدة</h4>
            <ul className="space-y-2 text-xs text-slate-400">
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
            <h4 className="mb-3 text-xs font-bold text-white sm:text-sm">النشرة البريدية</h4>
            <p className="mb-3 text-xs text-slate-400">
              اشترك لتصلك أحدث الميزات والتحديثات الدورية بنظامنا.
            </p>
            {subscribed ? (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-400">
                <CheckCircle size={14} className="flex-shrink-0" />
                تم الاشتراك بنجاح! شكراً لك.
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
                  placeholder="name@example.com"
                  required
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="الاشتراك في النشرة البريدية"
                  className="absolute bottom-1 top-1 rounded-md bg-blue-600 px-3 text-xs font-bold text-white transition-colors hover:bg-blue-700 ltr:left-1 rtl:right-1"
                >
                  اشترك
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-900 pt-5 md:flex-row">
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} نظام الزهراء. جميع الحقوق محفوظة.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            صنع بـ <Heart size={13} className="fill-rose-500 text-rose-500" /> لخدمة قطاع قطع الغيار
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LandingFooter;
