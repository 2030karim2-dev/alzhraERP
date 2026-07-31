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
        return <div className="p-20 text-center animate-pulse font-bold text-gray-400">جاري مزامنة أسواق الصرف...</div>;
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
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 dark:from-black dark:via-slate-900/50 dark:to-black rounded-[2rem] p-6 text-white shadow-2xl relative overflow-hidden flex items-center justify-between border border-white/10 group overflow-hidden">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-[0.4em] text-emerald-100/70">العملة الأساسية للنظام</span>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-white/70 bg-clip-text text-transparent">{baseCurrency?.name_ar || 'ريال سعودي'}</h2>
                        <span className="text-lg font-bold text-emerald-400/80 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 shadow-inner backdrop-blur-md">{baseCurrency?.symbol}</span>
                    </div>
                    <p className="text-xs font-mono font-bold text-slate-400 mt-2 tracking-widest">{baseCurrency?.code} • BASE CURRENCY</p>
                </div>
                <div className="relative z-10 p-5 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-xl group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500 ease-out shadow-2xl">
                    <Globe size={40} className="text-emerald-400/80 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
                </div>

                {/* Decorative Background Elements */}
                <div className="absolute -right-10 -top-10 w-64 h-64 bg-emerald-500/20 rounded-full blur-[80px] group-hover:bg-emerald-400/30 transition-all duration-700"></div>
                <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-blue-500/20 rounded-full blur-[60px] group-hover:bg-indigo-500/30 transition-all duration-700 delay-100"></div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center px-1">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={14} className="text-blue-500" /> أسعار الصرف الحالية
                </h3>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
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
            <div className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 dark:to-transparent p-5 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 flex gap-4 items-start shadow-sm mt-2">
                <div className="p-2.5 bg-blue-100 dark:bg-blue-900/40 rounded-2xl text-blue-600 dark:text-blue-400 shrink-0 shadow-inner">
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
