import React from 'react';
import { TableProperties } from 'lucide-react';
import { useAccompanyingInfoStore } from '../store/accompanyingInfoStore';
import { cn } from '../../../core/utils';

export const AccompanyingInfoSettingCard: React.FC = () => {
  const { enabled, setEnabled } = useAccompanyingInfoStore();

  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-xs transition-all">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
            <TableProperties size={20} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[var(--app-text)]">
                ميزة المعلومات المرافقة في هيدر التطبيق (Companion Info HUD)
              </h3>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  enabled
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                )}
              >
                {enabled ? 'مفعلة ومثبتة في الهيدر' : 'معطلة ومخفية'}
              </span>
            </div>
            <p className="max-w-2xl text-xs leading-relaxed text-[var(--app-text-secondary)]">
              تثبيت زر اختصار المعلومات المرافقة في شريط العنوان العلوي (الهيدر) لفحص كشوفات حسابات
              العملاء والأصناف والفواتير لحظياً بنمط الجداول الذكية. عند التعطيل، يتم إخفاء الميزة
              تماماً من الهيدر ومنع ظهور النوافذ التلقائية.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => {
              setEnabled(!enabled);
            }}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
              enabled ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'
            )}
          >
            <span
              className={cn(
                'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                enabled ? '-translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccompanyingInfoSettingCard;
