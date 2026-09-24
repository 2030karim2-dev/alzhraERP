/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/no-confusing-void-expression, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
import React from 'react';
import { ArrowRight, FileText, Printer, Receipt, Sparkles, UserCheck, Wallet } from 'lucide-react';
import type { Account } from '../../../accounting/types';
import { isDebitNormalAccount } from '../../../accounting/utils/ledgerBalance';
import type { DatePreset } from '@/core/types/invoiceSearch';
import { getDateRangeForPreset } from '@/core/utils/dateUtils';
import { formatCurrency } from '@/core/utils';
import Button from '@/ui/base/Button';
import SearchableAccountSelector from '@/ui/common/SearchableAccountSelector';
import ShareButton from '@/ui/common/ShareButton';
import { DATE_PRESETS, type AccountFilterType, type LedgerMetrics } from './types';

interface ExpenseLedgerToolbarProps {
  onBackToList?: (() => void) | undefined;
  accountFilterType: AccountFilterType;
  setAccountFilterType: (type: AccountFilterType) => void;
  filteredAccounts: Account[];
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  datePreset: DatePreset;
  setDatePreset: (preset: DatePreset) => void;
  dateFrom?: string | undefined;
  setDateFrom: (date?: string) => void;
  dateTo?: string | undefined;
  setDateTo: (date?: string) => void;
  selectedAccount?: Account | null | undefined;
  ledgerLength: number;
  ledgerMetrics: LedgerMetrics;
  onPrint: () => void;
  categories: any[];
}

export const ExpenseLedgerToolbar: React.FC<ExpenseLedgerToolbarProps> = ({
  onBackToList,
  accountFilterType,
  setAccountFilterType,
  filteredAccounts,
  selectedAccountId,
  setSelectedAccountId,
  datePreset,
  setDatePreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  selectedAccount,
  ledgerLength,
  ledgerMetrics,
  onPrint,
  categories,
}) => {
  return (
    <div className="no-print flex flex-col gap-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {onBackToList && (
            <button
              type="button"
              onClick={onBackToList}
              className="flex items-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 text-xs font-bold text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]"
            >
              <ArrowRight size={14} />
              <span>العودة للقائمة</span>
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <FileText size={16} />
            </span>
            <div>
              <h3 className="text-xs font-black text-[var(--app-text)]">
                كشف حساب تفصيلي للمصروفات والعهد
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="py-0.2 inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  <span>عليه (+) = ما صُرف أو استُلم</span>
                </span>
                <span className="py-0.2 inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>له (-) = ما سُدد أو قُدم كفواتير</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Account Scope Filter Tabs */}
        <div className="flex rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] p-0.5">
          <button
            type="button"
            onClick={() => setAccountFilterType('all')}
            className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
              accountFilterType === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
            }`}
          >
            الكل
          </button>
          <button
            type="button"
            onClick={() => setAccountFilterType('expense')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
              accountFilterType === 'expense'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
            }`}
          >
            <Receipt size={12} />
            <span>مصروفات (5xxx)</span>
          </button>
          <button
            type="button"
            onClick={() => setAccountFilterType('employee')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
              accountFilterType === 'employee'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
            }`}
          >
            <UserCheck size={12} />
            <span>مستحقات ورواتب (140xxx)</span>
          </button>
          <button
            type="button"
            onClick={() => setAccountFilterType('cash')}
            className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-all ${
              accountFilterType === 'cash'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text)]'
            }`}
          >
            <Wallet size={12} />
            <span>الصناديق (101xxx)</span>
          </button>
        </div>
      </div>

      {/* Account Selector & Date Range Row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Searchable Account Selector */}
        <div className="lg:col-span-5">
          <SearchableAccountSelector
            accounts={filteredAccounts}
            selectedId={selectedAccountId}
            onSelect={setSelectedAccountId}
            placeholder="ابحث برقم أو اسم الحساب المراد كشفه..."
            className="w-full"
          />
        </div>

        {/* Date Presets */}
        <div className="flex flex-wrap items-center gap-1 lg:col-span-4">
          {DATE_PRESETS.map(preset => {
            const isActive = datePreset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setDatePreset(preset.id);
                  const range = getDateRangeForPreset(preset.id);
                  setDateFrom(range.from);
                  setDateTo(range.to);
                }}
                className={`rounded-md px-2 py-1 text-[11px] font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-[var(--app-bg)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Action Buttons: Print, Share */}
        <div className="flex items-center justify-end gap-2 lg:col-span-3">
          {selectedAccount && ledgerLength > 0 && (
            <>
              {(() => {
                const isDebitNormal = isDebitNormalAccount(selectedAccount.type);
                const isCredit = isDebitNormal
                  ? ledgerMetrics.closingBalance < 0
                  : ledgerMetrics.closingBalance > 0;
                const isZero = Math.abs(ledgerMetrics.closingBalance) < 0.001;
                const balText = isZero
                  ? 'متزن (خالص)'
                  : isCredit
                    ? `له: ${formatCurrency(Math.abs(ledgerMetrics.closingBalance))}`
                    : `عليه: ${formatCurrency(Math.abs(ledgerMetrics.closingBalance))}`;

                return (
                  <ShareButton
                    size="sm"
                    showLabel
                    eventType="ledger"
                    title={`كشف حساب ${selectedAccount.name}`}
                    message={`📒 كشف حساب مالي - ${selectedAccount.name} (${selectedAccount.code})\n━━━━━━━━━━━━━━\n📕 إجمالي ما عليه: ${formatCurrency(ledgerMetrics.totalDebit)}\n📗 إجمالي ما له: ${formatCurrency(ledgerMetrics.totalCredit)}\n💰 صافي الرصيد: ${balText}\n📅 الفترة: من ${dateFrom || 'البداية'} إلى ${dateTo || 'الآن'}`}
                  />
                );
              })()}
              <Button
                onClick={onPrint}
                variant="outline"
                size="sm"
                leftIcon={<Printer size={13} />}
              >
                طباعة
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Custom Date Pickers when preset is custom */}
      {datePreset === 'custom' && (
        <div className="border-[var(--app-border)]/60 flex flex-wrap items-center gap-3 border-t pt-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[var(--app-text-secondary)]">من تاريخ:</span>
            <input
              type="date"
              value={dateFrom || ''}
              onChange={e => setDateFrom(e.target.value)}
              className="h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[var(--app-text-secondary)]">إلى تاريخ:</span>
            <input
              type="date"
              value={dateTo || ''}
              onChange={e => setDateTo(e.target.value)}
              className="h-8 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 text-xs font-bold text-[var(--app-text)]"
            />
          </div>
        </div>
      )}

      {/* Quick Category Chips: Clicking a category maps immediately to its account */}
      {categories.length > 0 && (
        <div className="border-[var(--app-border)]/40 flex flex-wrap items-center gap-1.5 border-t pt-2">
          <span className="flex items-center gap-1 text-[10px] font-bold text-[var(--app-text-secondary)]">
            <Sparkles size={11} className="text-amber-500" />
            <span>فئات المصروفات الشائعة:</span>
          </span>
          {categories.map((cat: any) => {
            if (!cat.account_id) return null;
            const isSelected = selectedAccountId === cat.account_id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedAccountId(String(cat.account_id))}
                className={`rounded-md border px-2 py-0.5 text-[10px] font-bold transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950 dark:text-blue-300'
                    : 'border-[var(--app-border)] bg-[var(--app-bg)] text-[var(--app-text-secondary)] hover:border-blue-400 hover:text-[var(--app-text)]'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
