
import React from 'react';
import { useDiscountStore } from '../../taxDiscountStore';
import { Tag } from 'lucide-react';

const DiscountSettings: React.FC = () => {
    const { discountEnabled, setDiscountEnabled } = useDiscountStore();

    return (
        <div className="space-y-6">
            {/* Discount Toggle */}
            <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900/50 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                            <Tag size={18} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">الخصومات</h4>
                            <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5">إظهار عمود الخصم في الفواتير</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={discountEnabled}
                            onChange={(e) => setDiscountEnabled(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-emerald-500"></div>
                    </label>
                </div>
            </div>

            {/* Info Notice */}
            {!discountEnabled && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl animate-in fade-in duration-300">
                    <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400 leading-relaxed">
                        💡 الخصم معطل حالياً. لن تظهر أعمدة الخصم في الفواتير.
                    </p>
                </div>
            )}
        </div>
    );
};

export default DiscountSettings;
