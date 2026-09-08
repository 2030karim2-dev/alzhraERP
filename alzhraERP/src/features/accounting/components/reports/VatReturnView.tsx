import React from 'react';
import { FileText, Printer, ArrowDownLeft, ArrowUpRight, Scale, BookOpen } from 'lucide-react';
import Button from '../../../../ui/base/Button';
import { formatCurrency } from '../../../../core/utils';
import { useVatReturnReport } from '../../hooks/useReports';

interface Props {
  dateRange: { from: string; to: string };
}

const VatReturnView: React.FC<Props> = ({ dateRange }) => {
  const { data, isLoading } = useVatReturnReport(dateRange.from, dateRange.to);

  const handlePrint = () => {
    window.print();
  };

  const salesTaxable = data?.sales?.taxable_amount || 0;
  const salesVat = data?.sales?.tax_amount || 0;
  const purchasesTaxable = data?.purchases?.taxable_amount || 0;
  const purchasesVat = data?.purchases?.tax_amount || 0;
  const netVat = data?.net_vat_payable || 0;
  const ledgerCredits = data?.vat_account_summary?.total_credits || 0;
  const ledgerDebits = data?.vat_account_summary?.total_debits || 0;
  const ledgerNet = data?.vat_account_summary?.net_balance || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400">
            <FileText size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-[var(--app-text)]">
              مساعد إقرار ضريبة القيمة المضافة (VAT Return Assistant)
            </h2>
            <p className="text-xs text-gray-500">
              ملخص ضريبة المدخلات والمخرجات للفترة من{' '}
              <span className="font-mono font-bold text-gray-700 dark:text-slate-300">
                {dateRange.from}
              </span>{' '}
              إلى{' '}
              <span className="font-mono font-bold text-gray-700 dark:text-slate-300">
                {dateRange.to}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <Button
            onClick={handlePrint}
            variant="outline"
            size="sm"
            leftIcon={<Printer size={14} />}
          >
            طباعة الإقرار
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-[var(--app-surface)] p-12 text-center text-xs text-gray-400 dark:border-slate-800">
          جاري تجميع حركات فواتير المبيعات والمشتريات وحساب 2200 لإعداد الإقرار الضريبي...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Net Result Banner */}
          <div
            className={`rounded-xl border p-5 shadow-sm ${
              netVat > 0
                ? 'border-amber-200 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/20'
                : netVat < 0
                  ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                  : 'border-blue-200 bg-blue-50/70 dark:border-blue-900/40 dark:bg-blue-950/20'
            }`}
          >
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-xl p-3 ${
                    netVat > 0
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                      : netVat < 0
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                  }`}
                >
                  <Scale size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--app-text)]">
                    {netVat > 0
                      ? 'صافي الضريبة الواجبة للسداد إلى الهيئة'
                      : netVat < 0
                        ? 'صافي الضريبة المستحقة للاسترداد من الهيئة'
                        : 'صافي الضريبة المستحقة: متوازنة'}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-slate-400">
                    الناتج من معادلة: (ضريبة المخرجات المحصلة - ضريبة المدخلات المدفوعة)
                  </p>
                </div>
              </div>

              <div className="text-end">
                <div
                  className={`font-mono text-2xl font-bold sm:text-3xl ${
                    netVat > 0
                      ? 'text-amber-700 dark:text-amber-400'
                      : netVat < 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-blue-700 dark:text-blue-400'
                  }`}
                >
                  {formatCurrency(Math.abs(netVat))}
                </div>
                <div className="text-[10px] font-bold text-gray-400">
                  {netVat > 0 ? 'مستحق للسداد' : netVat < 0 ? 'رصيد دائن مسترد' : 'لا يوجد استحقاق'}
                </div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Sales (Output VAT) */}
            <div className="rounded-xl border border-gray-200 bg-[var(--app-surface)] p-4 shadow-sm dark:border-slate-800">
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/30">
                    <ArrowDownLeft size={16} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100">
                    1. المبيعات وضريبة المخرجات (Output VAT)
                  </h4>
                </div>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                  محصلة من العملاء
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-lg bg-gray-50/70 p-2.5 dark:bg-slate-900/40">
                  <span className="text-gray-600 dark:text-slate-400">
                    إجمالي المبيعات الخاضعة للضريبة (بدون الضريبة)
                  </span>
                  <span className="font-mono font-bold text-gray-800 dark:text-slate-100">
                    {formatCurrency(salesTaxable)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-emerald-50/60 p-2.5 dark:bg-emerald-950/20">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300">
                    إجمالي ضريبة المخرجات المحصلة
                  </span>
                  <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(salesVat)}
                  </span>
                </div>
              </div>
            </div>

            {/* Purchases (Input VAT) */}
            <div className="rounded-xl border border-gray-200 bg-[var(--app-surface)] p-4 shadow-sm dark:border-slate-800">
              <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-rose-50 p-1.5 text-rose-600 dark:bg-rose-950/30">
                    <ArrowUpRight size={16} />
                  </div>
                  <h4 className="text-sm font-bold text-gray-800 dark:text-slate-100">
                    2. المشتريات وضريبة المدخلات (Input VAT)
                  </h4>
                </div>
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                  مدفوعة للموردين
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between rounded-lg bg-gray-50/70 p-2.5 dark:bg-slate-900/40">
                  <span className="text-gray-600 dark:text-slate-400">
                    إجمالي المشتريات الخاضعة للضريبة (بدون الضريبة)
                  </span>
                  <span className="font-mono font-bold text-gray-800 dark:text-slate-100">
                    {formatCurrency(purchasesTaxable)}
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-lg bg-rose-50/60 p-2.5 dark:bg-rose-950/20">
                  <span className="font-bold text-rose-900 dark:text-rose-300">
                    إجمالي ضريبة المدخلات القابلة للخصم
                  </span>
                  <span className="font-mono text-sm font-bold text-rose-700 dark:text-rose-400">
                    {formatCurrency(purchasesVat)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Ledger Account 2200 Audit Reconciliation Card */}
          <div className="rounded-xl border border-slate-200 bg-[var(--app-surface)] p-4 shadow-sm dark:border-slate-800">
            <div className="mb-3 flex items-center gap-2">
              <BookOpen size={16} className="text-blue-600" />
              <h4 className="text-xs font-bold text-gray-800 dark:text-slate-200">
                مطابقة دفتر الأستاذ لحساب ضريبة القيمة المضافة المستحقة (2200)
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="text-[11px] text-gray-500">حركات دائنة (ضريبة مبيعات)</div>
                <div className="mt-1 font-mono text-sm font-bold text-gray-800 dark:text-slate-100">
                  {formatCurrency(ledgerCredits)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="text-[11px] text-gray-500">حركات مدينة (تسويات وخصومات)</div>
                <div className="mt-1 font-mono text-sm font-bold text-gray-800 dark:text-slate-100">
                  {formatCurrency(ledgerDebits)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/30">
                <div className="text-[11px] text-gray-500">صافي الرصيد الدفتري الحالي</div>
                <div className="mt-1 font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(ledgerNet)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VatReturnView;
