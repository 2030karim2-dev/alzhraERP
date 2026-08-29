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
        activeRateEdit, setActiveRateEdit,
        setNewRateValue,
        isAddModalOpen, setIsAddModalOpen,
        newCurrency, setNewCurrency,
        handleUpdateRate, handleAddCurrency,
        deleteCurrency, refreshRates, isSaving
    } = useCurrencyManager();

    if (currencies.isLoading || rates.isLoading) {
        return <div className="p-20 max-md:p-6 text-center animate-pulse font-bold text-gray-400">جاري مزامنة أسواق الصرف...</div>;
    }

    const allCurrencies = ((currencies.data || []) as CurrencyRow[]);
    const baseCurrency = allCurrencies.find(c => c.is_base);
    const otherCurrencies = allCurrencies.filter(c => !c.is_base);

    const allRates = ((rates.data || []) as ExchangeRateRow[]);
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
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            {/* Base Currency Highlight */}
            <div className="bg-slate-900 dark:bg-slate-950 rounded-2xl p-6 max-md:p-4 text-white relative flex items-center justify-between border border-slate-800">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">العملة الأساسية للنظام</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-2xl max-md:text-xl font-bold text-white">{baseCurrency?.name_ar || 'ريال سعودي'}</h2>
                        <span className="text-sm font-semibold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded border border-emerald-800/60">{baseCurrency?.symbol}</span>
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-1">{baseCurrency?.code} • BASE CURRENCY</p>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/60">
                    <Globe size={28} className="text-slate-300" />
                </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 max-md:gap-2">
                    <TrendingUp size={14} className="text-blue-500" /> أسعار الصرف الحالية
                </h3>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1 max-md:gap-1.5 shadow-lg shadow-blue-500/20"
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
            <div className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent p-5 max-md:p-5 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 flex gap-4 max-md:gap-4 items-start shadow-sm mt-2">
                <div className="p-2 max-md:p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-2xl text-blue-600 dark:text-blue-400 shrink-0 shadow-inner">
                    <AlertCircle size={20} />
                </div>
                <div>
                    <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-1">معلومة هامة</h4>
                    <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 leading-relaxed md:w-3/4">
                        نقوم بتسجيل وتثبيت (Snapshots) أسعار الصرف لكل عملية مالية بشكل دائم. تعديل سعر الصرف هنا سيؤثر حصرياً على العمليات المستقبلية والجديدة ولن يقوم بتغيير أي أرصدة تخص فواتير وسندات سابقة للحفاظ على التدقيق المالي المحاسبي.
                    </p>
                </div>
            </div>

            <AddCurrencyModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onAdd={handleAddCurrency}
                isSaving={isSaving}
                newCurrency={newCurrency}
                setNewCurrency={setNewCurrency}
            />
        </div>
    );
};

export default CurrencyManager;
