
import React from 'react';
import { Layers, ScanLine, Clock, AlertTriangle, Warehouse } from 'lucide-react';
import { formatNumberDisplay } from '../../../../core/utils';

interface Props {
    stats: {
        total: number;
        counted: number;
        pending: number;
        discrepancies: number;
    };
    session: any;
}

const StatBox: React.FC<{ icon: any, label: string, value: number, color: string}> = ({ icon: Icon, label, value, color }) => (
    <div className={`bg-white dark:bg-slate-900 p-2 sm:p-4 border-l-2 sm:border-l-4 ${color.replace('text-','border-')} flex items-center gap-2 sm:gap-4`}>
        <Icon size={18} className={`${color} sm:w-6 sm:h-6`} />
        <div>
            <h4 className="text-lg sm:text-2xl font-bold font-mono text-gray-800 dark:text-slate-100">{formatNumberDisplay(value)}</h4>
            <p className="text-[8px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">{label}</p>
        </div>
    </div>
);

const AuditStats: React.FC<Props> = ({ stats, session }) => {
    return (
        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 shadow-sm grid grid-cols-2 md:grid-cols-5 overflow-hidden rounded-xl">
            <div className="col-span-2 md:col-span-1 p-3 sm:p-4 flex flex-col justify-center bg-gray-50/50 dark:bg-slate-950/50 border-b md:border-b-0 md:border-l dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <Warehouse size={14} className="text-blue-500 sm:w-4 sm:h-4" />
                    <h3 className="text-[9px] sm:text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest truncate">
                        {session.warehouses?.name}
                    </h3>
                </div>
                 <p className="text-[8px] sm:text-xs text-gray-400 font-bold mt-1 sm:mt-1.5">
                    بدء: {new Date(session.created_at).toLocaleDateString('ar-SA')}
                 </p>
            </div>
            <StatBox icon={Layers} label="إجمالي الأصناف" value={stats.total} color="text-blue-500" />
            <StatBox icon={ScanLine} label="تم جرده" value={stats.counted} color="text-emerald-500" />
            <StatBox icon={Clock} label="متبقي" value={stats.pending} color="text-amber-500" />
            <StatBox icon={AlertTriangle} label="فروقات" value={stats.discrepancies} color="text-rose-500" />
        </div>
    );
};

export default AuditStats;