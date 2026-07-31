import React from 'react';
import { Package } from 'lucide-react';
import { formatCurrency } from '../../../../core/utils';
import { ReturnsType } from '../../hooks/useReturnsReport';

interface Props {
    topParties: any[];
    type: ReturnsType;
}

const ReturnsTopParties: React.FC<Props> = ({ topParties, type }) => {
    return (
        <div className="glass-panel bento-item p-10 bg-white/40 dark:bg-slate-900/40 border-none shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-white mb-1">
                        {type === 'sales' ? 'تحليل العملاء النشطين في المرتجعات' :
                            type === 'purchase' ? 'تحليل الموردين النشطين في المرتجعات' :
                                'تحليل الأطراف الأكثر تفاعلاً'}
                    </h4>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">High-Impact Flow Entities Analysis</p>
                </div>
            </div>
            {topParties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                    {topParties.map((party, index) => (
                        <div key={index} className="group relative flex items-center justify-between p-6 bg-white/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 overflow-hidden">
                            <div className="absolute inset-y-0 right-0 w-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-6">
                                <div className="w-12 h-12 flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl text-lg font-black italic group-hover:scale-110 transition-transform">
                                    #{index + 1}
                                </div>
                                <div>
                                    <span className="block font-black text-slate-800 dark:text-white text-lg tracking-tight mb-1">{party.name}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Returns Count:</span>
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 rounded-full text-[10px] font-black text-slate-600 dark:text-slate-300">{party.count}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-left">
                                <div className="text-2xl font-black text-slate-800 dark:text-white font-mono tracking-tighter">
                                    {formatCurrency(party.total)}
                                </div>
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1 opacity-60">Aggregate Return Value</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-slate-50 dark:bg-slate-800/30 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <Package size={48} className="mx-auto text-slate-300 mb-4 opacity-20" />
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">No Significant Flow Detected in Current Context</p>
                </div>
            )}
        </div>
    );
};

export default ReturnsTopParties;
