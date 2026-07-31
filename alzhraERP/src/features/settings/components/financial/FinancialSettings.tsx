import { useI18nStore } from '@/lib/i18nStore';
import CurrencyManager from '../CurrencyManager';
import FiscalYearManager from '../FiscalYearManager';
import DiscountSettings from './DiscountSettings';
import ExchangeRateHistory from './ExchangeRateHistory';
import { useDefaultExchangeRates } from '../../hooks/useDefaultExchangeRates';
import { Banknote, ShieldCheck, Zap } from 'lucide-react';

const FinancialSettings: React.FC = () => {
   const { dictionary: t } = useI18nStore();

   // بذر أسعار الصرف الحقيقية تلقائياً إذا لم تكن موجودة
   useDefaultExchangeRates();

   return (
      <div className="p-2 md:p-3 animate-in fade-in duration-500 max-w-none mx-auto space-y-6 pb-20">
         {/* Header Section */}
         <div className="flex flex-row justify-between items-center gap-4 border-b dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2.5">
               <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
                  <Banknote size={20} />
               </div>
               <div>
                  <h2 className="text-sm font-bold text-gray-800 dark:text-slate-100 uppercase tracking-tighter">
                     {t.financial_system || 'النظام المالي'}
                  </h2>
                  <p className="text-[9px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest leading-none">
                     {t.financial_system_desc || 'تكوين الدورة المحاسبية وقواعد الصرف'}
                  </p>
               </div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
               <Zap size={14} className="text-emerald-500 animate-pulse" />
               <span className="text-[9px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest hidden sm:inline">
                  {t.active_status || 'Active'}
               </span>
            </div>
         </div>

         {/* Tax & Discount Settings */}
         <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-1">
               <div className="w-1 h-3.5 bg-amber-500 rounded-full"></div>
               <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                  {t.tax_discount_settings || 'إعدادات الخصومات'}
               </h3>
            </div>
            <div className="hidden">
               <DiscountSettings />
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: Fiscal Years */}
            <div className="lg:col-span-5 space-y-3">
               <div className="flex items-center gap-1.5 px-1">
                  <div className="w-1 h-3.5 bg-purple-500 rounded-full"></div>
                  <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                     {t.fiscal_periods || 'الفترات والسنوات المالية'}
                  </h3>
               </div>
               <FiscalYearManager />

               <div className="p-4 bg-slate-900 rounded-2xl text-white relative overflow-hidden shadow-md border-r-2 border-purple-500">
                  <div className="relative z-10">
                     <h4 className="text-[9px] font-bold text-purple-400 mb-1.5 uppercase tracking-widest">
                        {t.close_period || 'إغلاق الفترة'}
                     </h4>
                     <p className="text-[9px] font-bold text-slate-400 leading-tight">
                        {t.close_period_desc || 'إغلاق السنة المالية يمنع أي تعديلات على القيود السابقة ويولد "قيود الإقفال" آلياً إلى حساب الأرباح المحتجزة.'}
                     </p>
                  </div>
                  <div className="absolute -right-2 -bottom-2 opacity-5 rotate-12">
                     <ShieldCheck size={40} />
                  </div>
               </div>
            </div>

            {/* Right Column: Currencies */}
            <div className="lg:col-span-7 space-y-3">
               <div className="flex items-center gap-1.5 px-1">
                  <div className="w-1 h-3.5 bg-blue-500 rounded-full"></div>
                  <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                     {t.currency_settings_desc || 'تعدد العملات وأسواق الصرف'}
                  </h3>
               </div>
               <CurrencyManager />
            </div>
         </div>

         {/* Exchange Rate History — سجل أسعار الصرف التاريخي */}
         <div className="space-y-3">
            <div className="flex items-center gap-1.5 px-1">
               <div className="w-1 h-3.5 bg-amber-500 rounded-full"></div>
               <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                  سجل أسعار الصرف التاريخي
               </h3>
            </div>
            <ExchangeRateHistory />
         </div>
      </div>
   );
};

export default FinancialSettings;
