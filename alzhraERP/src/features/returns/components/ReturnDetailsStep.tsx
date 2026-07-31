import React from 'react';
import { useFormContext } from 'react-hook-form';
import { Calendar, FileText, AlertCircle, Clock, Check, XCircle } from 'lucide-react';

// Return reasons with icons
const RETURN_REASONS = [
    { value: 'defective', label: 'منتج تالف', icon: '🔴', description: 'المنتج به عيب أو تلف' },
    { value: 'not_as_described', label: 'غير مطابق للمواصفات', icon: '⚠️', description: 'المنتج يختلف عن الوصف' },
    { value: 'wrong_item', label: 'صنف خاطئ', icon: '🔄', description: 'تم استلام منتج مختلف' },
    { value: 'quality_issue', label: 'مشكلة في الجودة', icon: '📉', description: 'جودة المنتج غير مرضية' },
    { value: 'expired', label: 'منتهي الصلاحية', icon: '⏳', description: 'المنتج منتهي الصلاحية' },
    { value: 'changed_mind', label: 'تغيير رأي', icon: '💭', description: 'تغيير رأي العميل' },
    { value: 'other', label: 'أخرى', icon: '📝', description: 'أسباب أخرى' },
];

const RETURN_STATUSES = [
    { value: 'processing', label: 'جاري المعالجة', color: 'blue', bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-400', icon: Clock },
    { value: 'accepted', label: 'مقبول', color: 'green', bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-700 dark:text-green-400', icon: Check },
    { value: 'rejected', label: 'مرفوض', color: 'red', bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-700 dark:text-red-400', icon: XCircle },
];

export const ReturnDetailsStep: React.FC = () => {
    const { register, watch, setValue, formState: { errors } } = useFormContext();
    const selectedReason = watch('returnReason');
    const selectedStatus = watch('status');

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Step 3: Details */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border-2 border-slate-100 dark:border-slate-700/50 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-6">
                    <FileText size={20} />
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">تفاصيل الإرجاع</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Return Date */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            تاريخ الإرجاع <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="date"
                                {...register('date')}
                                className="w-full pr-10 pl-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50 transition-colors dark:text-white"
                            />
                        </div>
                        {errors.date && (
                            <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1">
                                <AlertCircle size={12} />
                                {errors.date.message as string}
                            </p>
                        )}
                    </div>

                    {/* Return Status */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                            حالة المرتجع <span className="text-red-500">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {RETURN_STATUSES.map(status => {
                                const Icon = status.icon;
                                const isSelected = selectedStatus === status.value;
                                return (
                                    <button
                                        key={status.value}
                                        type="button"
                                        onClick={() => setValue('status', status.value, { shouldValidate: true })}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${isSelected
                                            ? `border-${status.color}-500 ${status.bgColor}`
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        <Icon size={20} className={`mb-1 ${isSelected ? status.textColor : 'text-slate-400'}`} />
                                        <span className={`text-xs font-bold ${isSelected ? status.textColor : 'text-slate-600 dark:text-slate-400'}`}>
                                            {status.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        {errors.status && (
                            <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-1">
                                <AlertCircle size={12} />
                                {errors.status.message as string}
                            </p>
                        )}
                    </div>
                </div>

                {/* Return Reason */}
                <div className="mt-6">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                        سبب الإرجاع <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {RETURN_REASONS.map(reason => (
                            <button
                                key={reason.value}
                                type="button"
                                onClick={() => setValue('returnReason', reason.value, { shouldValidate: true })}
                                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all group ${selectedReason === reason.value
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 bg-slate-50 dark:bg-slate-900'
                                    }`}
                            >
                                <span className={`text-2xl mb-2 transition-transform ${selectedReason === reason.value ? 'scale-110' : 'group-hover:scale-110'}`}>
                                    {reason.icon}
                                </span>
                                <span className={`text-sm font-bold text-center ${selectedReason === reason.value ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'
                                    }`}>
                                    {reason.label}
                                </span>
                                <span className="text-[10px] text-slate-500 mt-1 text-center opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-1">
                                    {reason.description}
                                </span>
                            </button>
                        ))}
                    </div>
                    {errors.returnReason && (
                        <p className="text-xs font-bold text-red-500 flex items-center gap-1 mt-2">
                            <AlertCircle size={12} />
                            {errors.returnReason.message as string}
                        </p>
                    )}
                </div>

                {/* Notes */}
                <div className="mt-6">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        ملاحظات إضافية
                    </label>
                    <textarea
                        {...register('notes')}
                        rows={3}
                        placeholder="أي تفاصيل أخرى حول المرتجع..."
                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50 resize-none transition-colors dark:text-white"
                    />
                </div>
            </div>
        </div>
    );
};
