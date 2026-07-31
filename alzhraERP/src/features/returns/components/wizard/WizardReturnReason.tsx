import React from 'react';
import { UseFormRegister } from 'react-hook-form';

interface Props {
    register: UseFormRegister<any>;
}

export const WizardReturnReason: React.FC<Props> = ({ register }) => {
    return (
        <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-800/50">
            <label className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tighter">
                سبب الإرجاع الأساسي <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                    { id: 'defective', title: 'تالف مصنعياً', desc: 'Defective' },
                    { id: 'not_as_described', title: 'غير مطابق للمواصفات', desc: 'Not as described' },
                    { id: 'wrong_item', title: 'صنف خاطئ', desc: 'Wrong item shipped' },
                    { id: 'quality_issue', title: 'مشاكل في الجودة', desc: 'Quality concerns' },
                    { id: 'expired', title: 'منتهي الصلاحية', desc: 'Expired product' },
                    { id: 'other', title: 'أخرى', desc: 'Other reasons' },
                ].map((reason) => (
                    <label key={reason.id} className="relative cursor-pointer group">
                        <input
                            type="radio"
                            value={reason.id}
                            {...register('returnReason')}
                            className="peer sr-only"
                        />
                        <div className="p-4 rounded-xl border-2 border-slate-100 dark:border-slate-800/50 hover:border-rose-200 dark:hover:border-rose-900 peer-checked:border-rose-500 peer-checked:bg-rose-50 dark:peer-checked:bg-rose-900/20 transition-all">
                            <span className="block text-sm font-bold text-slate-700 dark:text-slate-300 peer-checked:text-rose-700 dark:peer-checked:text-rose-400 mb-1">
                                {reason.title}
                            </span>
                            <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-60">
                                {reason.desc}
                            </span>
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
};
