import React from 'react';
import { useDiscountStore } from '../../taxDiscountStore';
import { Tag } from 'lucide-react';

const DiscountSettings: React.FC = () => {
  const { discountEnabled, setDiscountEnabled } = useDiscountStore();

  return (
    <div className="space-y-6">
      {/* Discount Toggle */}
      <div className="bg-[var(--app-surface)]/50 rounded-2xl border border-slate-200 p-5 shadow-sm dark:border-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2 dark:bg-emerald-900/30">
              <Tag size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-slate-200">الخصومات</h4>
              <p className="mt-0.5 text-[10px] text-gray-400 dark:text-slate-500">
                إظهار عمود الخصم في الفواتير
              </p>
            </div>
          </div>
          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={discountEnabled}
              onChange={e => {
                setDiscountEnabled(e.target.checked);
              }}
              className="peer sr-only"
            />
            <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 dark:border-slate-600 dark:bg-slate-700 dark:peer-focus:ring-emerald-800 rtl:peer-checked:after:-translate-x-full"></div>
          </label>
        </div>
      </div>

      {/* Info Notice */}
      {!discountEnabled && (
        <div className="animate-in fade-in rounded-2xl border border-blue-100 bg-blue-50 p-4 duration-300 dark:border-blue-900/30 dark:bg-blue-950/20">
          <p className="text-[11px] font-bold leading-relaxed text-blue-700 dark:text-blue-400">
            💡 الخصم معطل حالياً. لن تظهر أعمدة الخصم في الفواتير.
          </p>
        </div>
      )}
    </div>
  );
};

export default DiscountSettings;
