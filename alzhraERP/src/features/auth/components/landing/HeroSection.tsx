import { motion } from 'framer-motion';
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

/* eslint-disable max-lines-per-function -- قسم Hero البصري يضم عديد الإحصائيات وبطاقات المراقبة */
const HeroSection: React.FC<HeroSectionProps> = ({ scrollToRegister, scrollToFeatures }) => {
  const { dir } = useTranslation();
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;

  return (
    <section className="relative isolate overflow-hidden px-3 pb-8 pt-20 sm:px-6 sm:pb-12 lg:px-8 lg:pb-14 lg:pt-24">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[linear-gradient(180deg,#f8fbff_0%,#f1f5f9_100%)] dark:bg-[linear-gradient(180deg,#08111f_0%,#0f172a_100%)]" />

      <div className="mx-auto max-w-[1440px]">
        <div className="mb-4 flex items-center justify-between gap-2 border-y border-slate-200/70 py-1.5 text-[10px] font-bold text-slate-500 dark:border-slate-700/70 dark:text-slate-400 sm:mb-6 sm:text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> منصة إدارة متكاملة
          </span>
          <span className="hidden items-center gap-1.5 sm:flex">
            <Cpu size={12} className="text-blue-500" /> عمليات قطع الغيار
          </span>
          <span className="flex items-center gap-1.5">
            <Activity size={12} className="text-emerald-500" /> نظام مباشر وسريع
          </span>
        </div>

        <div
          className="grid items-center gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-10 xl:gap-14"
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
              className="mb-3 inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:border-blue-800/50 dark:bg-blue-950/40 dark:text-blue-300 sm:mb-4"
            >
              <Activity size={12} className="text-blue-600 dark:text-blue-400" /> مركز عمليات قطع
              الغيار المتطور
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mx-auto max-w-2xl text-3xl font-black leading-tight tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:mx-0 lg:text-5xl"
            >
              إدارة أدق.
              <br />
              <span className="text-blue-600 dark:text-blue-400">قرارات أسرع.</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mx-auto mt-3 max-w-lg text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-300 sm:mt-4 sm:text-sm sm:leading-7 lg:mx-0"
            >
              نظام الزهراء يربط المخزون، المبيعات، المحاسبة ومطابقة قطع الغيار في واجهة واحدة سريعة
              ومريحة لجميع أعمالك.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-center sm:gap-3 lg:justify-start"
            >
              <button
                type="button"
                onClick={scrollToRegister}
                className="group flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white transition-colors hover:bg-blue-700 active:scale-[0.98] sm:h-10 sm:px-5 sm:text-sm"
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
                className="flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white/80 px-4 text-xs font-bold text-slate-800 transition-colors hover:border-blue-400 hover:text-blue-600 active:scale-[0.98] dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 sm:h-10 sm:px-5 sm:text-sm"
              >
                استكشف المنصة <ArrowIcon size={14} />
              </button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-6 grid grid-cols-3 gap-2 border-t border-slate-200/80 pt-3 dark:border-slate-700/80 sm:mt-8 sm:pt-4"
            >
              {LANDING_HERO_STATS.map(stat => (
                <div
                  key={stat.label}
                  className="min-w-0 rounded-lg border border-slate-200/80 bg-white/60 p-2 text-center backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/50 sm:p-2.5"
                >
                  <div className="text-base font-black text-blue-600 dark:text-blue-400 sm:text-xl">
                    <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="mt-0.5 truncate text-[10px] font-bold text-slate-500 dark:text-slate-400 sm:text-[11px]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="relative order-2 min-h-[280px] lg:order-1 lg:min-h-[460px]"
          >
            <div className="absolute inset-2 rounded-xl border border-blue-200/60 bg-white/20 backdrop-blur-[2px] dark:border-blue-400/10 dark:bg-slate-900/20 sm:inset-6" />
            <div className="absolute inset-0 z-10 flex items-center justify-center p-2 sm:p-4">
              <img
                src="/assets/hero-3d-parts-card.jpg"
                alt="قطع غيار سيارات ثلاثية الأبعاد"
                width={500}
                height={500}
                fetchPriority="high"
                decoding="async"
                className="h-auto w-full max-w-[460px] object-contain drop-shadow-md"
              />
            </div>

            <div className="absolute left-0 top-4 z-20 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:left-2 sm:top-8 sm:p-2.5">
              <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <Gauge size={11} className="text-blue-500" /> دقة المطابقة
              </div>
              <div className="text-sm font-black text-slate-950 dark:text-white sm:text-base">
                98.4%
              </div>
            </div>

            <div className="absolute bottom-6 right-0 z-20 rounded-lg border border-slate-200 bg-white/95 p-2 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 sm:bottom-10 sm:right-2 sm:p-2.5">
              <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                <Truck size={11} className="text-emerald-500" /> طلبات التوريد
              </div>
              <div className="flex items-end gap-1">
                <span className="text-sm font-black text-slate-950 dark:text-white sm:text-base">
                  24
                </span>
                <span className="pb-0.5 text-[10px] font-medium text-slate-500">طلباً متوقعاً</span>
              </div>
            </div>

            <div className="absolute bottom-0 left-1/2 z-20 grid w-[94%] -translate-x-1/2 grid-cols-3 gap-1.5 sm:w-[90%] sm:gap-2">
              {telemetry.map(({ label, value, meta, icon: Icon, tone }) => (
                <div
                  key={label}
                  className={`min-w-0 rounded-lg border px-1.5 py-1.5 backdrop-blur sm:px-2 sm:py-2 ${toneClasses.get(tone) ?? ''}`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <Icon size={11} />
                    <span className="truncate text-[10px] font-bold">{label}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[10px] font-black sm:text-xs">{value}</div>
                  <div className="truncate text-[9px] opacity-75">{meta}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="mt-8 grid gap-2 sm:mt-10 sm:grid-cols-3 sm:gap-3" dir={dir}>
          {[
            {
              icon: Database,
              title: 'بيانات مترابطة',
              text: 'كل حركة في المخزون والمبيعات قابلة للتتبع.',
            },
            {
              icon: Zap,
              title: 'تنفيذ لحظي',
              text: 'أقل نقرات، أداء فائق، وتجربة محسّنة للهاتف.',
            },
            {
              icon: ShieldCheck,
              title: 'أمان موثوق',
              text: 'عزل بيانات المحلات وصلاحيات دقيقة لكل مستخدم.',
            },
          ].map(({ icon: Icon, title, text }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-2.5 rounded-lg border border-slate-200/80 bg-white/60 p-2.5 backdrop-blur dark:border-slate-700/80 dark:bg-slate-900/50 sm:p-3"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
                <Icon size={13} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 dark:text-white">{title}</div>
                <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
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
