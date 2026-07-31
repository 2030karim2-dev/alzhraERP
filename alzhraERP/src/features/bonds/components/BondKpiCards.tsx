import React from 'react';
import { ArrowDownCircle, ArrowUpCircle, Wallet, Activity } from 'lucide-react';
import { cn, formatCurrency } from '../../../core/utils';

interface BondKpiCardsProps {
    totals: {
        receiptCount: number;
        receiptAmount: number;
        paymentCount: number;
        paymentAmount: number;
        netAmount: number;
    };
    analytics: {
        avgAmount: number;
        count: number;
    };
}

const BondKpiCards: React.FC<BondKpiCardsProps> = ({ totals, analytics }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-emerald-500/30 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                <div className="absolute top-0 right-0 p-6 opacity-20 transform group-hover:rotate-12 transition-transform duration-500">
                    <ArrowDownCircle size={60} />
                </div>
                <p className="text-[10px] font-bold uppercase opacity-60 tracking-[0.2em] mb-3">إجمالي القبض</p>
                <h2 dir="ltr" className="text-3xl font-bold font-mono tracking-tighter mb-1">{formatCurrency(totals.receiptAmount)}</h2>
                <div className="flex items-center gap-2 mt-4 text-[10px] font-bold">
                    <span className="bg-white/10 px-3 py-1 rounded-full">{totals.receiptCount} سند قبض</span>
                </div>
            </div>

            <div className="bg-gradient-to-br from-rose-600 to-pink-700 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-rose-500/30 relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                <div className="absolute top-0 right-0 p-6 opacity-20 transform group-hover:rotate-12 transition-transform duration-500">
                    <ArrowUpCircle size={60} />
                </div>
                <p className="text-[10px] font-bold uppercase opacity-60 tracking-[0.2em] mb-3">إجمالي الصرف</p>
                <h2 dir="ltr" className="text-3xl font-bold font-mono tracking-tighter mb-1">{formatCurrency(totals.paymentAmount)}</h2>
                <div className="flex items-center gap-2 mt-4 text-[10px] font-bold">
                    <span className="bg-white/10 px-3 py-1 rounded-full">{totals.paymentCount} سند صرف</span>
                </div>
            </div>

            <div className={cn(
                "p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500",
                totals.netAmount >= 0
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-blue-500/30'
                    : 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-orange-500/30'
            )}>
                <div className="absolute top-0 right-0 p-6 opacity-20 transform group-hover:scale-110 transition-transform duration-500">
                    <Wallet size={60} />
                </div>
                <p className="text-[10px] font-bold uppercase opacity-60 tracking-[0.2em] mb-3">صافي التدفق</p>
                <h2 dir="ltr" className="text-3xl font-bold font-mono tracking-tighter mb-1">{formatCurrency(Math.abs(totals.netAmount))}</h2>
                <div className="flex items-center gap-2 mt-4">
                    <span className="text-[10px] font-bold uppercase bg-white/20 px-3 py-1 rounded-full">
                        {totals.netAmount >= 0 ? 'فائض نقدي' : 'عجز نقدي'}
                    </span>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform duration-500">
                <div className="absolute bottom-0 right-0 p-6 opacity-5 transform group-hover:-translate-y-2 transition-transform duration-500">
                    <Activity size={80} className="text-amber-500" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">متوسط قيمة السند</p>
                <h2 dir="ltr" className="text-3xl font-bold text-slate-900 dark:text-white font-mono tracking-tighter mb-1">{formatCurrency(analytics.avgAmount)}</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase">Calculated from {analytics.count} bonds</p>
            </div>
        </div>
    );
};

export default BondKpiCards;
