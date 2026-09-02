import React from 'react';
import { Globe, TrendingUp, Plus, AlertCircle } from 'lucide-react';
import { useCurrencies } from '../../hooks';
import { useCurrencyManager } from './hooks/useCurrencyManager';
import { CurrencyTable } from './components/CurrencyTable';
import { AddCurrencyModal } from './components/AddCurrencyModal';

interface CurrencyRow {
  code: string;
  name_ar?: string;
  symbol?: string;
  is_base?: boolean;
}

interface ExchangeRateRow {
  currency_code: string;
  rate_to_base: number;
  effective_date: string;
  created_at?: string;
}

const CurrencyManager: React.FC = () => {
  const { currencies, rates } = useCurrencies();
  const {
    activeRateEdit,
    setActiveRateEdit,
    setNewRateValue,
    isAddModalOpen,
    setIsAddModalOpen,
    newCurrency,
    setNewCurrency,
    handleUpdateRate,
    handleAddCurrency,
    deleteCurrency,
    refreshRates,
    isSaving,
  } = useCurrencyManager();

  if (currencies.isLoading || rates.isLoading) {
    return (
      <div className="animate-pulse p-20 text-center font-bold text-gray-400 max-md:p-6">
        جاري مزامنة أسواق الصرف...
      </div>
    );
  }

  const allCurrencies = (currencies.data || []) as CurrencyRow[];
  const baseCurrency = allCurrencies.find(c => c.is_base);
  const otherCurrencies = allCurrencies.filter(c => !c.is_base);

  const allRates = (rates.data || []) as ExchangeRateRow[];
  const getLatestRate = (code: string) => {
    const history = allRates.filter(r => r.currency_code === code);
    if (history.length === 0) return 1;
    const sorted = [...history].sort((a, b) => {
      const dateDiff = new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
    return sorted[0].rate_to_base;
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-3 space-y-4 duration-500">
      {/* Base Currency Highlight */}
      <div className="relative flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white dark:bg-slate-950 max-md:p-4">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              العملة الأساسية للنظام
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl font-bold text-white max-md:text-xl">
              {baseCurrency?.name_ar || 'ريال سعودي'}
            </h2>
            <span className="rounded border border-emerald-800/60 bg-emerald-950/60 px-2.5 py-0.5 text-sm font-semibold text-emerald-400">
              {baseCurrency?.symbol}
            </span>
          </div>
          <p className="mt-1 font-mono text-xs text-slate-400">
            {baseCurrency?.code} • BASE CURRENCY
          </p>
        </div>
        <div className="rounded-xl border border-slate-700/60 bg-slate-800/80 p-3">
          <Globe size={28} className="text-slate-300" />
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between px-1">
        <h3 className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 max-md:gap-2">
          <TrendingUp size={14} className="text-blue-500" /> أسعار الصرف الحالية
        </h3>
        <button
          onClick={() => {
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 max-md:gap-1.5"
        >
          <Plus size={14} /> إضافة عملة
        </button>
      </div>

      <CurrencyTable
        otherCurrencies={otherCurrencies}
        baseCurrency={baseCurrency}
        getLatestRate={getLatestRate}
        activeRateEdit={activeRateEdit}
        setActiveRateEdit={setActiveRateEdit}
        setNewRateValue={setNewRateValue}
        handleUpdateRate={handleUpdateRate}
        deleteCurrency={deleteCurrency}
        refreshRates={refreshRates}
        isSaving={isSaving}
      />

      {/* Info Alert */}
      <div className="mt-2 flex items-start gap-4 rounded-[2rem] border border-blue-100 bg-gradient-to-r from-blue-50/50 to-transparent p-5 shadow-sm dark:border-blue-900/30 dark:from-blue-900/10 dark:to-transparent max-md:gap-4 max-md:p-5">
        <div className="shrink-0 rounded-2xl bg-blue-100 p-2 text-blue-600 shadow-inner dark:bg-blue-900/40 dark:text-blue-400 max-md:p-2.5">
          <AlertCircle size={20} />
        </div>
        <div>
          <h4 className="mb-1 text-xs font-bold text-blue-800 dark:text-blue-300">معلومة هامة</h4>
          <p className="text-[10px] font-bold leading-relaxed text-blue-600/70 dark:text-blue-400/70 md:w-3/4">
            نقوم بتسجيل وتثبيت (Snapshots) أسعار الصرف لكل عملية مالية بشكل دائم. تعديل سعر الصرف
            هنا سيؤثر حصرياً على العمليات المستقبلية والجديدة ولن يقوم بتغيير أي أرصدة تخص فواتير
            وسندات سابقة للحفاظ على التدقيق المالي المحاسبي.
          </p>
        </div>
      </div>

      <AddCurrencyModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
        }}
        onAdd={handleAddCurrency}
        isSaving={isSaving}
        newCurrency={newCurrency}
        setNewCurrency={setNewCurrency}
      />
    </div>
  );
};

export default CurrencyManager;
