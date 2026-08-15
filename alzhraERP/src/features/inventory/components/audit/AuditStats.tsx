
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
    <div className={`bg-white dark:bg-slate-900/50 backdrop-blur-md p-1.5 sm:p-4 border-l sm:border-l-4 ${color.replace('text-','border-')} flex items-center gap-1.5 sm:gap-4 transition-all hover:bg-white/80 dark:hover:bg-slate-800`}>
        <div className={`p-1.5 sm:p-2 rounded-lg bg-gray-50 dark:bg-slate-800 ${color.replace('text-','bg-opacity-10 ')}`}>
            <Icon size={14} className={`${color} sm:w-6 sm:h-6`} />
        </div>
        <div className="min-w-0">
            <h4 className="text-sm sm:text-2xl font-black font-mono text-gray-900 dark:text-white leading-tight">{formatNumberDisplay(value)}</h4>
            <p className="text-[7px] sm:text-xs font-black text-gray-400 uppercase tracking-tighter sm:tracking-widest truncate">{label}</p>
        </div>
    </div>
);

const AuditStats: React.FC<Props> = ({ stats, session }) => {
    return (
        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-gray-200/50 dark:border-slate-800/50 shadow-xl shadow-gray-200/20 dark:shadow-none grid grid-cols-4 max-md:grid-cols-2 max-md:gap-1 max-md:p-1 md:grid-cols-5 overflow-hidden rounded-2xl">
            <div className="hidden md:flex col-span-1 p-4 flex-col justify-center bg-gray-50/50 dark:bg-slate-950/50 border-l dark:border-slate-800">
                <div className="flex items-center gap-2">
                    <Warehouse size={16} className="text-blue-500" />
                    <h3 className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest truncate">
                        {session.warehouses?.name}
                    </h3>
                </div>
                 <p className="text-[10px] text-gray-400 font-bold mt-1.5">
                    بدء: {new Date(session.created_at).toLocaleDateString('ar-SA-u-nu-latn')}
                 </p>
            </div>
            <StatBox icon={Layers} label="الإجمالي" value={stats.total} color="text-blue-500" />
            <StatBox icon={ScanLine} label="المجرد" value={stats.counted} color="text-emerald-500" />
            <StatBox icon={Clock} label="المتبقي" value={stats.pending} color="text-amber-500" />
            <StatBox icon={AlertTriangle} label="الفروقات" value={stats.discrepancies} color="text-rose-500" />
        </div>
    );
};

export default AuditStats;