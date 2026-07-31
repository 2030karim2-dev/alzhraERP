import React from 'react';
import { UseFormRegister } from 'react-hook-form';

interface Props {
    register: UseFormRegister<any>;
}

export const WizardReturnStatus: React.FC<Props> = ({ register }) => {
    const statuses = [
        { 
            id: 'processing', 
            title: 'تحت المعالجة (مسودة)', 
            desc: 'Draft Processing Status', 
            baseClass: 'border-slate-100 dark:border-slate-800/50 hover:border-blue-200 dark:hover:border-blue-900 peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20',
            textClass: 'peer-checked:text-blue-700 dark:peer-checked:text-blue-400'
        },
        { 
            id: 'accepted', 
            title: 'اعتماد نقدي / تسوية', 
            desc: 'Approved Settlement', 
            baseClass: 'border-slate-100 dark:border-slate-800/50 hover:border-emerald-200 dark:hover:border-emerald-900 peer-checked:border-emerald-500 peer-checked:bg-emerald-50 dark:peer-checked:bg-emerald-900/20',
            textClass: 'peer-checked:text-emerald-700 dark:peer-checked:text-emerald-400'
        },
        { 
            id: 'rejected', 
            title: 'مرفوض', 
            desc: 'Rejected Application', 
            baseClass: 'border-slate-100 dark:border-slate-800/50 hover:border-rose-200 dark:hover:border-rose-900 peer-checked:border-rose-500 peer-checked:bg-rose-50 dark:peer-checked:bg-rose-900/20',
            textClass: 'peer-checked:text-rose-700 dark:peer-checked:text-rose-400'
        }
    ];

    return (
        <div className="space-y-4">
            <label className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                الإجراء المالي المقترح <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {statuses.map((status) => (
                    <label key={status.id} className="relative cursor-pointer group">
                        <input
                            type="radio"
                            value={status.id}
                            {...register('status')}
                            className="peer sr-only"
                        />
                        <div className={`p-4 rounded-xl border-y-2 border-r-2 border-l-4 transition-all ${status.baseClass}`}>
                            <span className={`block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 ${status.textClass}`}>
                                {status.title}
                            </span>
                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">
                                {status.desc}
                            </span>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
};
