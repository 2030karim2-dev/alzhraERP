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
  CreditCard,
  Banknote,
  MinusCircle,
  PlusCircle,
  Calculator,
} from 'lucide-react';
import { formatLocalDate } from '../../../core/utils/dateUtils';
import { formatCurrency } from '../../../core/utils';
import { useAuthStore } from '../../auth/store';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';
import Button from '../../../ui/base/Button';
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
import { ReconciliationHistoryModal } from '../components/ReconciliationHistoryModal';

const DailyReconciliationPage: React.FC = () => {
  const { user } = useAuthStore();
  const { branchId, branchName } = useBranchFilter();

  const [selectedDate, setSelectedDate] = useState<string>(() => formatLocalDate());
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Form states
  const [countMode, setCountMode] = useState<'denominations' | 'quick'>('quick');
  const [cashCounts, setCashCounts] = useState<CashDenominationCounts>({});
  const [manualCashTotal, setManualCashTotal] = useState<number>(0);
  const [actualCard, setActualCard] = useState<number>(0);
  const [cardTerminalRef, setCardTerminalRef] = useState<string>('');
  const [floatRetained, setFloatRetained] = useState<number>(300);
  const [varianceReason, setVarianceReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const currency = 'SAR';

  const { data: summary, isLoading, isError, refetch } = useDailyDrawerSummary(selectedDate);
  const { mutate: commitReconciliation, isPending: isCommitting } = useCommitDailyReconciliation();
  const { data: historyList, isLoading: isHistoryLoading } = useReconciliationHistory(30);
  const isSubmittingRef = useRef(false);

  // Reset form state when date changes to prevent stale data from previous day
  useEffect(() => {
    setCashCounts({});
    setManualCashTotal(0);
    setCountMode('quick');
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
      const denoms = rec.cash_denominations || {};
      setCashCounts(denoms);
      const counted =
        rec.actual_cash_counted ?? reconciliationService.calculateDenominationsTotal(denoms);
      setManualCashTotal(counted);
      if (Object.keys(denoms).length > 0) {
        setCountMode('denominations');
      } else {
        setCountMode('quick');
      }
      setActualCard(rec.card_terminal_receipt_total || 0);
      setFloatRetained(rec.float_retained_for_tomorrow || 300);
      setVarianceReason(rec.variance_reason || '');
      setNotes(rec.notes || '');
    } else if (summary) {
      // Default initial actual card to expected card for convenience
      setActualCard(summary.expected_card_terminal || 0);
    }
  }, [summary]);

  const denomCalculatedTotal = reconciliationService.calculateDenominationsTotal(cashCounts);
  const actualCashCounted = countMode === 'denominations' ? denomCalculatedTotal : manualCashTotal;
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
      if (
        !confirm(`الكاش الفعلي المدخل هو ${formatCurrency(0, currency)}، هل أنت متأكد من المتابعة؟`)
      )
        return;
    }

    isSubmittingRef.current = true;
    commitReconciliation(
      {
        company_id: user.company_id,
        date: selectedDate,
        branch_id: branchId,
        opening_float: summary?.opening_float ?? 0,
        actual_cash_counted: actualCashCounted,
        cash_denominations: countMode === 'denominations' ? cashCounts : {},
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
    <div className="mx-auto max-w-7xl space-y-5 p-4 sm:p-6">
      {/* 1. Top Header */}
      <div className="flex flex-col gap-4 border-b border-[var(--app-border)] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] text-emerald-600 shadow-sm dark:text-emerald-400">
            <Scale className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-[var(--app-text)] sm:text-xl">
                المطابقة اليومية وإقفال الصندوق
              </h1>
              {isAlreadyClosed ? (
                <span className="flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <Lock className="h-3 w-3" />
                  مقفلة ومعتمدة
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                  <Unlock className="h-3 w-3" />
                  يومية نشطة
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--app-text-secondary)]">
              جرد درج النقدية، مطابقة تقرير ماكينة الشبكة، وتوريد الصافي للخزينة
              {branchName ? ` • ${branchName}` : ''}
            </p>
          </div>
        </div>

        {/* Action Controls */}
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
            className="gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400"
          >
            <Coffee className="h-4 w-4 text-amber-500" />
            <span>مصروف درج</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsHistoryModalOpen(true)}
            className="gap-1.5 text-xs font-bold"
          >
            <History className="h-4 w-4" />
            <span>سجل الأيام السابقة</span>
          </Button>

          {summary && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsPrintModalOpen(true)}
                className="gap-1.5 text-xs font-bold"
              >
                <Printer className="h-4 w-4" />
                <span>طباعة الإيصال</span>
              </Button>

              <WhatsAppShareButton
                summary={summary}
                actualCash={actualCashCounted}
                actualCard={actualCard}
                floatRetained={floatRetained}
                cashToOwner={cashToOwner}
                shopName={user?.company_name || 'مؤسسة الزهراء'}
              />
            </>
          )}
        </div>
      </div>

      {/* 2. Content Loading & Error Handling */}
      {isLoading ? (
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] text-[var(--app-text-secondary)]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          <p className="text-xs font-semibold">جاري جرد الصندوق وتجميع مبيعات اليومية...</p>
        </div>
      ) : isError ? (
        <div className="flex h-44 flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <p className="text-xs font-bold">تعذر استرجاع بيانات الصندوق لليوم المحدد</p>
          <Button variant="ghost" onClick={() => refetch()} className="text-xs">
            إعادة المحاولة
          </Button>
        </div>
      ) : summary ? (
        <>
          {/* Phase 1: Expected Drawer Balance Ledger Strip */}
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-card-bg)] p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between border-b border-[var(--app-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-black text-[var(--app-text)]">
                  الحالة الدفترية للصندوق (معادلة الدرج المحاسبية)
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[var(--app-text-secondary)]">إجمالي المبيعات الشامل:</span>
                <span className="font-black text-[var(--app-text)]">
                  {formatCurrency(summary.total_sales, currency)}
                </span>
              </div>
            </div>

            {/* Arithmetic Flow Breakdown */}
            <div className="grid grid-cols-2 gap-3 text-right sm:grid-cols-3 lg:grid-cols-5">
              {/* 1. Opening Float */}
              <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-2.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--app-text-secondary)]">
                  <span>عهدة بداية الصباح</span>
                  <Coins className="h-3.5 w-3.5 text-indigo-500" />
                </div>
                <div className="mt-1 text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(summary.opening_float, currency)}
                </div>
                <span className="text-[10px] text-[var(--app-text-secondary)]">
                  فكة مرحلة من الأمس
                </span>
              </div>

              {/* 2. Cash Inflow */}
              <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-2.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--app-text-secondary)]">
                  <span>+ مقبوضات الكاش</span>
                  <PlusCircle className="h-3.5 w-3.5 text-emerald-500" />
                </div>
                <div className="mt-1 text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(summary.cash_sales + (summary.cash_receipts || 0), currency)}
                </div>
                <span className="text-[10px] text-[var(--app-text-secondary)]">
                  {summary.cash_receipts
                    ? `مبيعات + قبض (${formatCurrency(summary.cash_receipts, currency)})`
                    : 'مبيعات نقدية'}
                </span>
              </div>

              {/* 3. Cash Outflow (Expenses & Disbursements) */}
              <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-2.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--app-text-secondary)]">
                  <span>- مصروفات الدرج</span>
                  <MinusCircle className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="mt-1 text-sm font-black text-amber-600 dark:text-amber-400">
                  {formatCurrency(
                    summary.petty_expenses_cash + (summary.cash_disbursements || 0),
                    currency
                  )}
                </div>
                <span className="text-[10px] text-[var(--app-text-secondary)]">نثريات مخصومة</span>
              </div>

              {/* 4. POS Terminal Expected */}
              <div className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-2.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--app-text-secondary)]">
                  <span>مبيعات الشبكة (مدى)</span>
                  <CreditCard className="h-3.5 w-3.5 text-cyan-500" />
                </div>
                <div className="mt-1 text-sm font-black text-cyan-600 dark:text-cyan-400">
                  {formatCurrency(summary.card_sales, currency)}
                </div>
                <span className="text-[10px] text-[var(--app-text-secondary)]">
                  إيداع بنكي مباشر
                </span>
              </div>

              {/* 5. Expected Cash in Drawer Result */}
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  <span>= المتوقع بالدرج</span>
                  <Banknote className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="mt-1 text-base font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(expectedCash, currency)}
                </div>
                <span className="text-[10px] text-[var(--app-text-secondary)]">
                  الرصيد الدفتري المطلوب
                </span>
              </div>
            </div>
          </div>

          {/* Phase 2: Physical Count (Cash Counter + Card Terminal) */}
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
            {/* Cash Counter (7 Cols) */}
            <div className="lg:col-span-7">
              <DenominationTouchCounter
                counts={cashCounts}
                onChange={setCashCounts}
                manualTotal={manualCashTotal}
                onManualTotalChange={setManualCashTotal}
                countMode={countMode}
                onCountModeChange={setCountMode}
                currency={currency}
                disabled={isLocked}
              />
            </div>

            {/* Terminal Input + Float Retained (5 Cols) */}
            <div className="flex flex-col gap-4 lg:col-span-5">
              <CardTerminalInputCard
                expectedCard={summary.expected_card_terminal}
                actualCard={actualCard}
                onActualCardChange={setActualCard}
                terminalRef={cardTerminalRef}
                onTerminalRefChange={setCardTerminalRef}
                currency={currency}
                disabled={isLocked}
              />

              <CashDropAndFloatCard
                actualCash={actualCashCounted}
                floatRetained={floatRetained}
                onFloatRetainedChange={setFloatRetained}
                cashToOwner={cashToOwner}
                currency={currency}
                disabled={isLocked}
              />
            </div>
          </div>

          {/* Phase 3: Final Settlement Banner & Drawer Lock Action */}
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
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
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
                          ? `يوجد فائض بالدرج (+${formatCurrency(cashVarianceInfo.variance, currency)})`
                          : `يوجد عجز بالدرج (${formatCurrency(cashVarianceInfo.variance, currency)})`}
                    </h4>
                    {cashVarianceInfo.isWithinTolerance &&
                      cashVarianceInfo.status !== 'balanced' && (
                        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                          ضمن حد التسامح (فكة مقبولة)
                        </span>
                      )}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--app-text-secondary)]">
                    المتوقع بالدرج:{' '}
                    <strong className="text-[var(--app-text)]">
                      {formatCurrency(expectedCash, currency)}
                    </strong>{' '}
                    | الكاش الفعلي المعدود:{' '}
                    <strong className="text-[var(--app-text)]">
                      {formatCurrency(actualCashCounted, currency)}
                    </strong>{' '}
                    | الصافي للمالك:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(cashToOwner, currency)}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Commit Action Button */}
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
                    className="h-10 bg-emerald-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
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

          {/* Phase 4: Collapsible Employee Breakdown */}
          <EmployeeSalesBreakdownCard
            breakdown={summary.employee_breakdown}
            totalSales={summary.total_sales}
            currency={currency}
            defaultExpanded={false}
          />
        </>
      ) : null}

      {/* Modals */}
      <QuickDrawerExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        selectedDate={selectedDate}
      />

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

      <ReconciliationHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onSelectDate={date => setSelectedDate(date)}
        historyList={historyList}
        isLoading={isHistoryLoading}
        currency={currency}
      />
    </div>
  );
};

export default DailyReconciliationPage;
