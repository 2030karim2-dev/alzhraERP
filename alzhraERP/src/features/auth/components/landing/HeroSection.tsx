import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Cpu,
  Database,
  Gauge,
  PackageCheck,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react';
import { useTranslation } from '../../../../lib/hooks/useTranslation';
import { AnimatedCounter } from '../AnimatedCounter';
import { containerVariants, itemVariants } from './landingAnimations';
import { LANDING_HERO_STATS } from '../../landing/landing.constants';

interface HeroSectionProps {
  scrollToRegister: () => void;
  scrollToFeatures: () => void;
}

const telemetry = [
  { label: 'حالة المخزون', value: 'مستقر', meta: '+12.8%', icon: PackageCheck, tone: 'emerald' },
  { label: 'فحص VIN', value: 'جاهز', meta: 'AI / 24ms', icon: ScanLine, tone: 'blue' },
  {
    label: 'حماية البيانات',
    value: 'مفعّلة',
    meta: 'RLS / 24×7',
    icon: ShieldCheck,
    tone: 'violet',
  },
] as const;

const toneClasses = new Map<string, string>([
  [
    'emerald',
    'border-emerald-200/80 bg-emerald-50/80 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300',
  ],
  [
    'blue',
    'border-blue-200/80 bg-blue-50/80 text-blue-700 dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300',
  ],
  [
    'violet',
    'border-violet-200/80 bg-violet-50/80 text-violet-700 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-300',
  ],
]);

/* eslint-disable max-lines-per-function -- قسم الـ Hero يحتوي عديد العناصر البصرية (تليمتري/إحصائيات/بطاقات عائمة) */
const HeroSection: React.FC<HeroSectionProps> = ({ scrollToRegister, scrollToFeatures }) => {
  const { dir } = useTranslation();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  type FloatTransition =
    | { duration: number }
    | { duration: number; delay: number; repeat: number; repeatType: 'mirror'; ease: 'easeInOut' };

  const floatTransition = (duration: number, delay = 0): FloatTransition =>
    shouldReduceMotion
      ? { duration: 0 }
      : {
          duration,
          delay,
          repeat: Infinity,
          repeatType: 'mirror' as const,
          ease: 'easeInOut' as const,
        };

  return (
    <section className="relative isolate overflow-hidden px-3 pb-12 pt-36 sm:px-6 sm:pb-20 lg:px-10 lg:pb-28 lg:pt-40">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.16),transparent_30%),radial-gradient(circle_at_82%_44%,rgba(16,185,129,0.12),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef5ff_56%,#f8fbff_100%)] dark:bg-[radial-gradient(circle_at_18%_18%,rgba(37,99,235,0.22),transparent_30%),radial-gradient(circle_at_82%_44%,rgba(16,185,129,0.12),transparent_28%),linear-gradient(180deg,#08111f_0%,#0b1526_56%,#08111f_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-40 bg-[linear-gradient(to_right,rgba(37,99,235,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(37,99,235,0.08)_1px,transparent_1px)] [background-size:28px_28px] [mask-image:linear-gradient(to_bottom,black,transparent)] dark:bg-[linear-gradient(to_right,rgba(147,197,253,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(147,197,253,0.08)_1px,transparent_1px)]" />
      <div className="pointer-events-none absolute -left-28 top-56 -z-10 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl dark:bg-blue-500/10" />
      <div className="pointer-events-none absolute -right-28 bottom-24 -z-10 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl dark:bg-emerald-400/10" />

      <div className="mx-auto max-w-[1440px]">
        <div className="mb-5 flex items-center justify-between gap-2 border-y border-slate-200/70 py-2.5 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500 dark:border-slate-700/70 dark:text-slate-400 sm:mb-8 sm:text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse bg-emerald-500" /> Al Zahra Intelligence
            Layer
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <Cpu size={11} className="text-blue-500" /> Enterprise Parts Operations
          </span>
          <span className="flex items-center gap-1.5">
            <Activity size={11} className="text-emerald-500" /> Live Systems
          </span>
        </div>

        <div
          className="grid items-center gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12 xl:gap-20"
          dir={dir}
        >
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="order-1 text-center lg:order-2 lg:text-right"
          >
            <motion.div
              variants={itemVariants}
              className="mb-4 inline-flex items-center gap-2 border border-blue-200 bg-blue-50/80 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-blue-700 shadow-sm dark:border-blue-400/20 dark:bg-blue-400/10 dark:text-blue-300 sm:mb-6 sm:px-3 sm:text-[11px]"
            >
              <Sparkles size={12} className="text-blue-500" /> مركز عمليات قطع الغيار الذكي
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mx-auto max-w-3xl text-[clamp(2.5rem,8vw,6.8rem)] font-black leading-[0.94] tracking-[-0.07em] text-slate-950 dark:text-white lg:mx-0"
            >
              إدارة أدق.
              <br />
              <span className="bg-gradient-to-l from-blue-700 via-blue-500 to-emerald-500 bg-clip-text text-transparent">
                قرارات أسرع.
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mx-auto mt-5 max-w-xl text-xs font-bold leading-7 text-slate-600 dark:text-slate-300 sm:mt-7 sm:text-sm sm:leading-8 lg:mx-0"
            >
              نظام الزهراء يربط المخزون، المبيعات، المحاسبة وذكاء VIN في مساحة تشغيل واحدة. بيانات
              أوضح، بحث أسرع، وتوريد استباقي قبل أن ينفد أي جزء.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-center sm:gap-2 lg:justify-start"
            >
              <button
                type="button"
                onClick={scrollToRegister}
                className="group flex min-h-11 items-center justify-center gap-2 bg-slate-950 px-4 text-xs font-black text-white shadow-[0_14px_35px_-16px_rgba(15,23,42,0.65)] transition-all hover:-translate-y-0.5 hover:bg-blue-700 active:scale-[0.97] dark:bg-white dark:text-slate-950 dark:hover:bg-blue-100 sm:px-6 sm:text-sm"
              >
                ابدأ مجاناً الآن{' '}
                <ArrowIcon
                  size={14}
                  className="transition-transform group-hover:-translate-x-0.5"
                />
              </button>
              <button
                type="button"
                onClick={scrollToFeatures}
                className="flex min-h-11 items-center justify-center gap-2 border border-slate-300 bg-white/70 px-4 text-xs font-black text-slate-800 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:text-blue-700 active:scale-[0.97] dark:border-slate-600 dark:bg-slate-900/70 dark:text-white dark:hover:border-blue-400 sm:px-6 sm:text-sm"
              >
                استكشف المنصة <ArrowIcon size={14} />
              </button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-7 grid grid-cols-3 gap-1.5 border-t border-slate-200/80 pt-4 dark:border-slate-700/80 sm:mt-10 sm:gap-2 sm:pt-5"
            >
              {LANDING_HERO_STATS.map(stat => (
                <div
                  key={stat.label}
                  className="min-w-0 rounded-lg border border-slate-200/80 bg-white/60 px-1.5 py-2.5 text-center backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/50 sm:px-2.5"
                >
                  <div className="text-sm font-black tracking-tight text-blue-600 dark:text-blue-300 sm:text-xl">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="mt-1 truncate text-[9px] font-black uppercase tracking-tight text-slate-500 dark:text-slate-400 sm:text-[10px]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            className="relative order-2 min-h-[340px] lg:order-1 lg:min-h-[560px]"
          >
            <div className="absolute inset-4 border border-blue-200/80 bg-white/25 backdrop-blur-[2px] dark:border-blue-400/15 dark:bg-slate-900/20 sm:inset-10" />
            <div className="absolute left-1/2 top-1/2 h-[78%] w-[78%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/15 blur-3xl dark:bg-blue-500/10" />
            <motion.div
              animate={shouldReduceMotion ? {} : { rotate: [0, 3, -2, 0], y: [0, -8, 0] }}
              transition={floatTransition(8)}
              className="absolute inset-0 z-10 flex items-center justify-center p-2 sm:p-8"
            >
              <img
                src="/assets/hero-3d-parts-card.jpg"
                alt="قطع غيار سيارات ثلاثية الأبعاد"
                width={560}
                height={560}
                fetchPriority="high"
                decoding="async"
                className="h-auto w-full max-w-[560px] object-contain drop-shadow-[0_32px_38px_rgba(15,23,42,0.28)]"
              />
            </motion.div>

            <motion.div
              animate={shouldReduceMotion ? {} : { y: [0, -7, 0] }}
              transition={floatTransition(5, 0.3)}
              className="absolute left-0 top-8 z-20 rounded-lg border border-slate-200 bg-white/90 p-2 shadow-xl shadow-blue-950/10 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:left-4 sm:top-14 sm:p-3"
            >
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <Gauge size={11} className="text-blue-500" /> Smart pulse
              </div>
              <div className="text-sm font-black text-slate-950 dark:text-white sm:text-lg">
                98.4%
              </div>
              <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                دقة المطابقة
              </div>
            </motion.div>

            <motion.div
              animate={shouldReduceMotion ? {} : { y: [0, 8, 0] }}
              transition={floatTransition(6, 0.7)}
              className="absolute bottom-10 right-0 z-20 rounded-lg border border-slate-200 bg-white/90 p-2 shadow-xl shadow-emerald-950/10 backdrop-blur dark:border-slate-700 dark:bg-slate-900/90 sm:bottom-16 sm:right-4 sm:p-3"
            >
              <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                <Truck size={11} className="text-emerald-500" /> Procurement AI
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-sm font-black text-slate-950 dark:text-white sm:text-lg">
                  24
                </span>
                <span className="pb-0.5 text-[10px] font-bold text-slate-500">طلباً متوقعاً</span>
              </div>
              <div className="mt-1 h-1 w-20 bg-slate-100 dark:bg-slate-700">
                <div className="h-full w-[76%] bg-emerald-500" />
              </div>
            </motion.div>

            <div className="absolute bottom-0 left-1/2 z-20 grid w-[92%] -translate-x-1/2 grid-cols-3 gap-1.5 sm:bottom-2 sm:w-[86%] sm:gap-2">
              {telemetry.map(({ label, value, meta, icon: Icon, tone }) => (
                <div
                  key={label}
                  className={`min-w-0 rounded-lg border px-1.5 py-2 backdrop-blur sm:px-2 sm:py-2.5 ${toneClasses.get(tone) ?? ''}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <Icon size={11} />
                    <span className="truncate text-[10px] font-black uppercase tracking-tight">
                      {label}
                    </span>
                  </div>
                  <div className="mt-1 truncate text-[11px] font-black sm:text-xs">{value}</div>
                  <div className="truncate text-[9px] font-bold opacity-70">{meta}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="mt-10 grid gap-2 sm:mt-16 sm:grid-cols-3 sm:gap-3" dir={dir}>
          {[
            {
              icon: Database,
              title: 'بيانات مترابطة',
              text: 'كل حركة في المخزون والمبيعات قابلة للتتبع.',
            },
            {
              icon: Zap,
              title: 'تنفيذ لحظي',
              text: 'أقل نقرات، قرارات أسرع، وتجربة محسّنة للهاتف.',
            },
            {
              icon: ShieldCheck,
              title: 'أمان مؤسسي',
              text: 'عزل بيانات الشركات وصلاحيات دقيقة لكل مستخدم.',
            },
          ].map(({ icon: Icon, title, text }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: index * 0.08 }}
              className="flex items-start gap-2 rounded-lg border border-slate-200/80 bg-white/55 p-3 backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/50 sm:gap-3 sm:p-4"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-slate-950 text-white dark:bg-blue-500">
                <Icon size={14} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-black text-slate-900 dark:text-white sm:text-xs">
                  {title}
                </div>
                <p className="mt-1 text-[10px] font-bold leading-5 text-slate-500 dark:text-slate-400 sm:text-[11px]">
                  {text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
