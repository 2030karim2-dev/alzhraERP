import React, { useState, useEffect, useRef } from 'react';
import {
  Scale,
  Calendar,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  Coffee,
  Printer,
  History,
  Check,
  Loader2,
  Coins,
  TrendingUp,
  CreditCard,
  Banknote,
} from 'lucide-react';
import { formatLocalDate } from '../../../core/utils/dateUtils';
import { useAuthStore } from '../../auth/store';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';
import Button from '../../../ui/base/Button';
import Card from '../../../ui/base/Card';
import {
  useDailyDrawerSummary,
  useCommitDailyReconciliation,
  useReconciliationHistory,
} from '../hooks/useDailyReconciliation';
import { reconciliationService } from '../services/reconciliationService';
import type { CashDenominationCounts } from '../types';

import { DenominationTouchCounter } from '../components/DenominationTouchCounter';
import { EmployeeSalesBreakdownCard } from '../components/EmployeeSalesBreakdownCard';
import { QuickDrawerExpenseModal } from '../components/QuickDrawerExpenseModal';
import { CashDropAndFloatCard } from '../components/CashDropAndFloatCard';
import { WhatsAppShareButton } from '../components/WhatsAppShareButton';
import { ReconciliationPrintModal } from '../components/ReconciliationPrintModal';
import { CardTerminalInputCard } from '../components/CardTerminalInputCard';

const DailyReconciliationPage: React.FC = () => {
  const { user } = useAuthStore();
  const { branchId, branchName } = useBranchFilter();

  const [selectedDate, setSelectedDate] = useState<string>(() => formatLocalDate());
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Form states
  const [cashCounts, setCashCounts] = useState<CashDenominationCounts>({});
  const [actualCard, setActualCard] = useState<number>(0);
  const [cardTerminalRef, setCardTerminalRef] = useState<string>('');
  const [floatRetained, setFloatRetained] = useState<number>(300);
  const [varianceReason, setVarianceReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const { data: summary, isLoading, isError, refetch } = useDailyDrawerSummary(selectedDate);
  const { mutate: commitReconciliation, isPending: isCommitting } = useCommitDailyReconciliation();
  const { data: historyList } = useReconciliationHistory(15);
  const isSubmittingRef = useRef(false);

  // Reset form state when date changes to prevent stale data from previous day
  useEffect(() => {
    setCashCounts({});
    setActualCard(0);
    setCardTerminalRef('');
    setFloatRetained(300);
    setVarianceReason('');
    setNotes('');
  }, [selectedDate]);

  // Sync state when existing reconciliation is loaded
  useEffect(() => {
    if (summary?.existing_reconciliation) {
      const rec = summary.existing_reconciliation;
      setCashCounts(rec.cash_denominations || {});
      setActualCard(rec.card_terminal_receipt_total || 0);
      setFloatRetained(rec.float_retained_for_tomorrow || 300);
      setVarianceReason(rec.variance_reason || '');
      setNotes(rec.notes || '');
    } else if (summary) {
      // Default initial actual card to expected card for convenience
      setActualCard(summary.expected_card_terminal || 0);
    }
  }, [summary]);

  const actualCashCounted = reconciliationService.calculateDenominationsTotal(cashCounts);
  const expectedCash = summary?.expected_cash_in_drawer ?? 0;
  const cashVarianceInfo = reconciliationService.calculateVariance(actualCashCounted, expectedCash);

  const isAlreadyClosed = summary?.is_already_closed ?? false;
  const isOwner = user?.role === 'owner';
  const isLocked = isAlreadyClosed && !isOwner;

  const cashToOwner = Math.max(0, Math.round((actualCashCounted - floatRetained) * 100) / 100);

  const handleCommit = () => {
    if (!user?.company_id) return;
    if (isSubmittingRef.current) return;
    if (actualCashCounted === 0 && expectedCash > 0) {
      if (!confirm('الكاش الفعلي المدخل هو 0 ر.س، هل أنت متأكد من المتابعة؟')) return;
    }

    isSubmittingRef.current = true;
    commitReconciliation(
      {
        company_id: user.company_id,
        date: selectedDate,
        branch_id: branchId,
        opening_float: summary?.opening_float ?? 0,
        actual_cash_counted: actualCashCounted,
        cash_denominations: cashCounts,
        card_terminal_receipt_total: actualCard,
        float_retained_for_tomorrow: floatRetained,
        cash_handed_to_owner: cashToOwner,
        variance_reason: varianceReason,
        notes,
      },
      {
        onSettled: () => {
          isSubmittingRef.current = false;
        },
      }
    );
  };

  return (
    <div className="space-y-5 p-4 sm:p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-[var(--app-text)]">
                المطابقة اليومية وإقفال الصندوق
              </h1>
              {isAlreadyClosed ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Lock className="h-3 w-3" />
                  مقفلة ومعتمدة
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                  <Unlock className="h-3 w-3" />
                  يومية نشطة
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--app-text-secondary)]">
              جرد درج النقدية، مطابقة أجهزة الشبكة، وفرز مبيعات الموظفين
              {branchName ? ` • ${branchName}` : ''}
            </p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Selector */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-card-bg)] px-2.5 py-1.5 shadow-sm">
            <Calendar className="h-4 w-4 text-[var(--app-text-secondary)]" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-transparent text-xs font-bold text-[var(--app-text)] focus:outline-none"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsExpenseModalOpen(true)}
            className="gap-1 text-xs font-bold text-amber-700 dark:text-amber-300"
          >
            <Coffee className="h-4 w-4 text-amber-500" />
            مصروف درج سريع
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowHistory(!showHistory)}
            className="gap-1 text-xs font-bold"
          >
            <History className="h-4 w-4" />
            {showHistory ? 'إخفاء الأرشيف' : 'سجل المطابقات'}
          </Button>

          {summary && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsPrintModalOpen(true)}
                className="gap-1 text-xs font-bold"
              >
                <Printer className="h-4 w-4" />
                طباعة الإيصال
              </Button>

              <WhatsAppShareButton
                summary={summary}
                actualCash={actualCashCounted}
                actualCard={actualCard}
                floatRetained={floatRetained}
                cashToOwner={cashToOwner}
                shopName={user?.company_name || 'محل الزهراء'}
              />
            </>
          )}
        </div>
      </div>

      {/* History Slide-in Table */}
      {showHistory && (
        <Card className="border-dashed p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--app-text)]">
            <History className="h-4 w-4 text-blue-500" />
            سجل إقفالات الأيام السابقة
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-[var(--app-border)] text-[var(--app-text-secondary)]">
                  <th className="py-2">التاريخ</th>
                  <th>إجمالي المبيعات</th>
                  <th>كاش الدرج</th>
                  <th>فارق الكاش</th>
                  <th>فارق الشبكة</th>
                  <th>المسلم للمالك</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {(historyList || []).map(row => (
                  <tr
                    key={row.id}
                    onClick={() => {
                      setSelectedDate(row.reconciliation_date);
                      setShowHistory(false);
                    }}
                    className="cursor-pointer border-b border-[var(--app-border)] hover:bg-[var(--app-hover)]"
                  >
                    <td className="py-2 font-bold text-blue-600">{row.reconciliation_date}</td>
                    <td>{row.total_sales.toLocaleString('ar-SA')} ر.س</td>
                    <td>{row.actual_cash_counted.toLocaleString('ar-SA')} ر.س</td>
                    <td
                      className={
                        row.cash_variance === 0
                          ? 'font-bold text-emerald-600'
                          : row.cash_variance > 0
                            ? 'font-bold text-amber-600'
                            : 'font-bold text-red-600'
                      }
                    >
                      {row.cash_variance > 0 ? `+${row.cash_variance}` : row.cash_variance} ر.س
                    </td>
                    <td>{row.card_variance === 0 ? '✓ مطابق' : `${row.card_variance} ر.س`}</td>
                    <td className="font-bold text-emerald-600">
                      {row.cash_handed_to_owner.toLocaleString('ar-SA')} ر.س
                    </td>
                    <td>
                      <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                        معتمد
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] text-[var(--app-text-secondary)]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-xs">جاري تجميع حركات الصندوق ومبيعات اليوم...</p>
        </div>
      ) : isError ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <p className="text-xs font-bold">تعذر استرجاع بيانات الصندوق لليوم المحدد</p>
          <Button variant="ghost" onClick={() => refetch()} className="text-xs">
            إعادة المحاولة
          </Button>
        </div>
      ) : summary ? (
        <>
          {/* Top KPI Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {/* Total Sales */}
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-[var(--app-text-secondary)]">
                <span>إجمالي مبيعات اليوم</span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-lg font-black text-[var(--app-text)]">
                {summary.total_sales.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-[var(--app-text-secondary)]">
                <span>
                  {summary.employee_breakdown.reduce((s, e) => s + e.invoice_count, 0)} فاتورة
                </span>
                {summary.credit_sales != null && summary.credit_sales > 0 && (
                  <span className="font-semibold text-purple-600 dark:text-purple-400">
                    ({summary.credit_sales.toLocaleString('ar-SA')} ر.س آجل)
                  </span>
                )}
              </div>
            </div>

            {/* Cash Sales */}
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-[var(--app-text-secondary)]">
                <span>مبيعات الكاش</span>
                <Banknote className="h-4 w-4 text-emerald-500" />
              </div>
              <div className="mt-2 text-lg font-black text-emerald-600 dark:text-emerald-400">
                {summary.cash_sales.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
              </div>
              <div className="flex flex-wrap items-center gap-1 text-[10px] text-[var(--app-text-secondary)]">
                <span>نقدية فواتير</span>
                {Boolean(summary.cash_receipts && summary.cash_receipts > 0) && (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    (+{summary.cash_receipts} قبض)
                  </span>
                )}
                {Boolean(summary.cash_disbursements && summary.cash_disbursements > 0) && (
                  <span className="font-bold text-red-600 dark:text-red-400">
                    (-{summary.cash_disbursements} صرف)
                  </span>
                )}
              </div>
            </div>

            {/* Card Sales */}
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-[var(--app-text-secondary)]">
                <span>عمليات الشبكة (مدى)</span>
                <CreditCard className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-2 text-lg font-black text-blue-600 dark:text-blue-400">
                {summary.card_sales.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
              </div>
              <span className="text-[10px] text-[var(--app-text-secondary)]">إيداع بنكي مباشر</span>
            </div>

            {/* Petty Cash Out */}
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-[var(--app-text-secondary)]">
                <span>مصروفات الدرج</span>
                <Coffee className="h-4 w-4 text-amber-500" />
              </div>
              <div className="mt-2 text-lg font-black text-amber-600 dark:text-amber-400">
                {summary.petty_expenses_cash.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}{' '}
                ر.س
              </div>
              <span className="text-[10px] text-amber-700/80 dark:text-amber-300/80">
                نثريات مخصومة
              </span>
            </div>

            {/* Opening Float */}
            <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] p-3.5 shadow-sm">
              <div className="flex items-center justify-between text-[11px] text-[var(--app-text-secondary)]">
                <span>عهدة فكة الصباح</span>
                <Coins className="h-4 w-4 text-indigo-500" />
              </div>
              <div className="mt-2 text-lg font-black text-indigo-600 dark:text-indigo-400">
                {summary.opening_float.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
              </div>
              <span className="text-[10px] text-[var(--app-text-secondary)]">
                مرحلة من إقفال الأمس
              </span>
            </div>
          </div>

          {/* Section: Employee Breakdown */}
          <EmployeeSalesBreakdownCard
            breakdown={summary.employee_breakdown}
            totalSales={summary.total_sales}
          />

          {/* Section: Reconciliation Core (Denominations + Terminal + Drop) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Denomination Counter (7 Cols) */}
            <div className="lg:col-span-7">
              <DenominationTouchCounter
                counts={cashCounts}
                onChange={setCashCounts}
                disabled={isLocked}
              />
            </div>

            {/* Terminal Input + Float & Drop (5 Cols) */}
            <div className="flex flex-col gap-4 lg:col-span-5">
              <CardTerminalInputCard
                expectedCard={summary.expected_card_terminal}
                actualCard={actualCard}
                onActualCardChange={setActualCard}
                terminalRef={cardTerminalRef}
                onTerminalRefChange={setCardTerminalRef}
                disabled={isLocked}
              />

              <CashDropAndFloatCard
                actualCash={actualCashCounted}
                floatRetained={floatRetained}
                onFloatRetainedChange={setFloatRetained}
                cashToOwner={cashToOwner}
                disabled={isLocked}
              />
            </div>
          </div>

          {/* Variance & Settlement Action Banner */}
          <div
            className={`rounded-xl border p-4 shadow-sm transition-colors ${
              cashVarianceInfo.status === 'balanced'
                ? 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20'
                : cashVarianceInfo.status === 'surplus'
                  ? 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20'
                  : 'border-red-500/30 bg-red-500/5 dark:bg-red-950/20'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    cashVarianceInfo.status === 'balanced'
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : cashVarianceInfo.status === 'surplus'
                        ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-red-500/20 text-red-600 dark:text-red-400'
                  }`}
                >
                  {cashVarianceInfo.status === 'balanced' ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : (
                    <AlertTriangle className="h-6 w-6" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[var(--app-text)]">
                      {cashVarianceInfo.status === 'balanced'
                        ? 'الدرج متطابق تماماً بنسبة 100%'
                        : cashVarianceInfo.status === 'surplus'
                          ? `يوجد فائض في الدرج (+${cashVarianceInfo.variance.toFixed(2)} ر.س)`
                          : `يوجد عجز في الدرج (${cashVarianceInfo.variance.toFixed(2)} ر.س)`}
                    </h4>
                    {cashVarianceInfo.isWithinTolerance &&
                      cashVarianceInfo.status !== 'balanced' && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          ضمن حد التسامح (فكة مقبولة)
                        </span>
                      )}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--app-text-secondary)]">
                    الكاش المتوقع بالدرج:{' '}
                    <strong>{expectedCash.toLocaleString('ar-SA')} ر.س</strong> | الكاش الفعلي
                    المعدود: <strong>{actualCashCounted.toLocaleString('ar-SA')} ر.س</strong>
                  </p>
                </div>
              </div>

              {/* Commit Button */}
              <div>
                {isAlreadyClosed ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      ✓ تم إقفال هذا اليوم بنجاح
                    </span>
                    {isOwner && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleCommit}
                        disabled={isCommitting}
                        className="text-xs font-bold"
                      >
                        {isCommitting ? 'جاري التحديث...' : 'تحديث الاعتماد (المالك)'}
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleCommit}
                    disabled={isCommitting}
                    className="h-11 bg-gradient-to-tr from-emerald-600 to-teal-600 px-6 text-sm font-black text-white shadow-md shadow-emerald-500/30 hover:from-emerald-700 hover:to-teal-700"
                  >
                    {isCommitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        جاري الإقفال والقفل...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        اعتماد وإقفال يومية المحل
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Explanation / Notes if variance exists */}
            {!cashVarianceInfo.isWithinTolerance && (
              <div className="mt-3 border-t border-[var(--app-border)] pt-3">
                <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
                  مبرر وسبب الفارق (مطلوب في حال العجز أو الزيادة الكبيرة):
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={varianceReason}
                  onChange={e => setVarianceReason(e.target.value)}
                  placeholder="اكتب توضيحاً للسبب (مثال: نسيان تسجيل فاتورة فلان، أو فرق فكة زبون)"
                  className="h-9 w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-card-bg)] px-3 text-xs text-[var(--app-text)] focus:border-red-500 focus:outline-none"
                />
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Quick Petty Cash Modal */}
      <QuickDrawerExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        selectedDate={selectedDate}
      />

      {/* Print Receipt Modal */}
      {summary && (
        <ReconciliationPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          summary={summary}
          actualCash={actualCashCounted}
          actualCard={actualCard}
          floatRetained={floatRetained}
          cashToOwner={cashToOwner}
          shopName={user?.company_name || 'مؤسسة الزهراء'}
        />
      )}
    </div>
  );
};

export default DailyReconciliationPage;
