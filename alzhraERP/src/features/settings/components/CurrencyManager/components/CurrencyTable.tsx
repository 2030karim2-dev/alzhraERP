import React from 'react';
import { ArrowRightLeft, Save, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { cn } from '../../../../../core/utils';

// Local icon component
const XIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

interface CurrencyTableProps {
  otherCurrencies: any[];
  baseCurrency: any | undefined;
  getLatestRate: (code: string) => number;
  activeRateEdit: string | null;
  setActiveRateEdit: (code: string | null) => void;
  setNewRateValue: (val: number) => void;
  handleUpdateRate: (code: string) => void;
  deleteCurrency: (code: string) => void;
  refreshRates?: () => void;
  isSaving?: boolean;
}

export const CurrencyTable: React.FC<CurrencyTableProps> = ({
  otherCurrencies,
  baseCurrency,
  getLatestRate,
  activeRateEdit,
  setActiveRateEdit,
  setNewRateValue,
  handleUpdateRate,
  deleteCurrency,
  refreshRates,
  isSaving,
}) => {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-gray-200/50 bg-white/80 shadow-xl shadow-blue-900/5 backdrop-blur-2xl dark:border-slate-800/50 dark:bg-slate-900/80 dark:shadow-black/20">
      <div className="flex items-center justify-between border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-transparent p-6 dark:border-slate-800/60 dark:from-slate-800/20">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-blue-100 p-2.5 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
            <ArrowRightLeft size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-slate-100">أسعار الصرف</h3>
            <p className="text-[10px] font-medium text-gray-500">
              إدارة أسعار العملات مقابل {baseCurrency?.code}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://ye-rial.com/aden/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-[10px] font-bold text-gray-500 transition-colors hover:text-blue-600"
          >
            <ExternalLink size={12} />
            المصدر: ye-rial.com (عدن)
          </a>
          <button
            onClick={() => refreshRates?.()}
            disabled={isSaving}
            className={cn(
              'flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-[10px] font-bold text-white shadow-lg shadow-blue-600/20 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50',
              isSaving && 'animate-pulse'
            )}
          >
            <RefreshCw size={14} className={cn(isSaving && 'animate-spin')} />
            تحديث من السوق (بيع - عدن)
          </button>
        </div>
      </div>

      <div className="overflow-x-auto p-1">
        <table className="w-full border-collapse text-right">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-800/60">
              <th className="w-20 p-5 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                الرمز
              </th>
              <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                اسم العملة
              </th>
              <th className="p-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                الكود المرجعي
              </th>
              <th className="w-72 p-5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                سعر الصرف (مقابل {baseCurrency?.code})
              </th>
              <th className="w-24 p-5 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                إجراءات
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">
            {otherCurrencies.map((curr: any) => {
              const currentRate = getLatestRate(curr.code);
              const isEditing = activeRateEdit === curr.code;

              return (
                <tr
                  key={curr.code}
                  className={cn(
                    'border-b border-gray-100 transition-colors duration-150 dark:border-slate-800/60',
                    isEditing
                      ? 'bg-blue-50/50 dark:bg-blue-950/20'
                      : 'hover:bg-gray-50/60 dark:hover:bg-slate-800/40'
                  )}
                >
                  <td className="p-3.5 text-center align-middle">
                    <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-slate-100 text-sm font-bold text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400">
                      {curr.symbol}
                    </div>
                  </td>
                  <td className="p-3.5 align-middle">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      {curr.name_ar}
                    </h4>
                  </td>
                  <td className="p-3.5 align-middle">
                    <div className="flex flex-col items-start gap-1">
                      <span className="rounded border border-gray-200 bg-gray-100 px-2 py-1 font-mono text-xs font-semibold text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {curr.code}
                      </span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${curr.exchange_operator === 'multiply' ? 'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800/50 dark:bg-indigo-950/40 dark:text-indigo-300' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-300'}`}
                      >
                        {curr.exchange_operator === 'multiply' ? 'ضرب (×)' : 'قسمة (÷)'}
                      </span>
                    </div>
                  </td>
                  <td className="p-3.5 align-middle">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <div className="relative w-full">
                          <input
                            autoFocus
                            type="number"
                            defaultValue={currentRate}
                            onChange={e => {
                              setNewRateValue(parseFloat(e.target.value));
                            }}
                            className="w-full rounded-lg border border-blue-500 bg-white p-2 pr-8 font-mono text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-950"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 select-none text-xs font-bold text-gray-400">
                            {curr.code}
                          </span>
                        </div>
                        <button
                          onClick={() => {
                            handleUpdateRate(curr.code);
                          }}
                          className="shrink-0 rounded-lg bg-blue-600 p-2 text-white shadow-xs transition-colors hover:bg-blue-700"
                          title="حفظ التعديل"
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setActiveRateEdit(null);
                          }}
                          className="shrink-0 rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800"
                          title="إلغاء التعديل"
                        >
                          <XIcon size={16} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => {
                          setActiveRateEdit(curr.code);
                          setNewRateValue(currentRate);
                        }}
                        className="flex cursor-pointer items-center justify-between rounded-lg border border-transparent p-2 transition-colors hover:border-gray-200 hover:bg-white dark:hover:border-slate-700 dark:hover:bg-slate-900"
                        title="انقر لتعديل السعر"
                      >
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-mono text-sm font-bold text-gray-800 dark:text-slate-200">
                              {currentRate.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 4,
                              })}
                            </span>
                            <span className="font-mono text-[10px] text-gray-400">
                              {baseCurrency?.code}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-400">
                            المعادل = المبلغ {curr.exchange_operator === 'multiply' ? '×' : '÷'}{' '}
                            {currentRate}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-gray-400 hover:text-blue-600">
                          <span className="text-[10px]">تعديل</span>
                          <ArrowRightLeft size={12} />
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="p-3.5 text-center align-middle">
                    <button
                      onClick={() => {
                        if (confirm('هل أنت متأكد من مسح هذه العملة نهائياً بنظام لا رجعة فيه؟'))
                          deleteCurrency(curr.code);
                      }}
                      className="mx-auto rounded-md p-1.5 text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-slate-800"
                      title="حذف العملة من النظام"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
