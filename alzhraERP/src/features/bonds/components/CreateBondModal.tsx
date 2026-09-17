import React, { useState } from 'react';
import {
  DollarSign,
  Calendar,
  FileText,
  Search,
  Landmark,
  Save,
  Tag,
  Building,
  Wallet,
  BookOpen,
  Keyboard,
  Maximize2,
  Minimize2,
  Calculator,
  Coins,
} from 'lucide-react';
import type { BondFormData, BondType } from '../types';
import { useBondForm } from '../hooks/useBondForm';

import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import { cn, formatCurrency, formatLocalDate, formatNumber } from '../../../core/utils';
import PartyInvoicesList from './PartyInvoicesList';

interface CreateBondModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: BondType;
  onSubmit: (data: BondFormData) => void;
  isSubmitting: boolean;
  defaultAccountId?: string | null;
}

// Micro-Component for Styled Select Inputs
const AccountSelector: React.FC<{
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  [key: string]: unknown;
}> = ({ label, icon: Icon, children, ...props }) => (
  <div className="space-y-1.5">
    <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
      {label}
    </label>
    <div className="relative">
      <select
        {...props}
        className="w-full appearance-none rounded-xl border-2 border-gray-100 bg-white p-3 pr-10 text-sm font-bold text-slate-800 outline-none focus:border-blue-500/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
      >
        {children}
      </select>
      <Icon className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
    </div>
  </div>
);

const CreateBondModal: React.FC<CreateBondModalProps> = ({
  isOpen,
  onClose,
  type,
  onSubmit,
  isSubmitting,
  defaultAccountId,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(true);

  const bond = useBondForm(isOpen, type, defaultAccountId, onSubmit);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    currencies,
    parties,
    partyQuery,
    setPartyQuery,
    showPartyDropdown,
    setShowPartyDropdown,
    selectedCurrency,
    counterpartyType,
    counterpartyId,
    selectedInvoiceId,
    enteredAmount,
    commissionAmount,
    isDivide,
    cashAccounts,
    otherAccounts,
    handlePartySelect,
    handleInvoiceSelect,
    handleQuickAmount,
    handleClearAmount,
    onValidSubmit,
    selectedCashAccount,
    selectedCounterpartyAccount,
    selectedParty,
    selectedCommissionAccount,
    tafqeetText,
    theme,
    amountInputStr,
    rateInputStr,
    equivalentSarInputStr,
    commissionInputStr,
    handleAmountChange,
    handleRateChange,
    handleEquivalentSarChange,
    handleCalculateRateFromEquivalent,
    handleCurrencyQuickSwitch,
    handleCommissionChange,
  } = bond;

  const footer = (
    <div className="flex w-full items-center justify-between gap-3 p-1">
      <div className="hidden items-center gap-3 text-xs text-slate-400 lg:flex">
        <span className="flex items-center gap-1 font-mono">
          <Keyboard size={14} />
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Ctrl + Enter
          </kbd>{' '}
          للحفظ السريع
        </span>
        <span className="flex items-center gap-1 font-mono">
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Esc
          </kbd>{' '}
          للإلغاء
        </span>
      </div>

      <div className="flex w-full items-center gap-3 lg:w-auto">
        <Button
          onClick={onClose}
          variant="outline"
          className="flex-1 px-6 py-3 text-xs font-bold uppercase transition-all hover:bg-gray-100 dark:hover:bg-slate-800 lg:flex-none"
        >
          إلغاء
        </Button>
        <Button
          onClick={handleSubmit(onValidSubmit)}
          isLoading={isSubmitting}
          disabled={isSubmitting}
          variant={type === 'receipt' ? 'success' : type === 'transfer' ? 'primary' : 'danger'}
          className="flex-2 px-8 py-3 text-xs font-bold uppercase shadow-xl shadow-blue-500/10 lg:flex-none"
          leftIcon={<Save size={18} className="transition-transform group-hover:scale-110" />}
        >
          اعتماد السند وحفظه
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={theme.icon}
      title={theme.title}
      description={theme.description}
      footer={footer}
      size={isFullscreen ? 'full' : '5xl'}
    >
      <div className="font-cairo w-full space-y-4">
        {/* Fullscreen desktop switch banner */}
        <div className="hidden items-center justify-between rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/40 sm:flex">
          <div className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                type === 'receipt'
                  ? 'bg-emerald-500'
                  : type === 'payment'
                    ? 'bg-rose-500'
                    : 'bg-blue-500'
              )}
            ></span>
            <span>وضع سطح المكتب عالي الكثافة (Desktop Ergonomic Workspace)</span>
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? 'استعادة الحجم المخصص' : 'توسيع إلى ملء الشاشة'}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit(onValidSubmit)} className="w-full">
          {/* Main Desktop 2-Column Split Workspace */}
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
            {/* Right Column: Primary Bond Entry Inputs (7 columns on desktop) */}
            <div className="space-y-5 lg:col-span-7">
              {/* Step 1: Head - Amount & Currency & Quick Presets */}
              <div
                className={cn(
                  'flex flex-col gap-4 rounded-2xl border-2 p-4 shadow-sm transition-all sm:rounded-3xl sm:p-6',
                  type === 'receipt'
                    ? 'border-emerald-100 bg-emerald-50/40 dark:border-emerald-800/20 dark:bg-emerald-900/10'
                    : type === 'transfer'
                      ? 'border-blue-100 bg-blue-50/40 dark:border-blue-800/20 dark:bg-blue-900/10'
                      : 'border-rose-100 bg-rose-50/40 dark:border-rose-800/20 dark:bg-rose-900/10'
                )}
              >
                {/* Currency quick switcher tabs */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3 dark:border-slate-800/60">
                  <div className="flex items-center gap-1.5">
                    <Coins size={15} className="text-slate-500 dark:text-slate-400" />
                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-300">
                      عملة السند:
                    </span>
                    <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                      {['SAR', 'YER', 'USD'].map(curr => (
                        <button
                          key={curr}
                          type="button"
                          onClick={() => handleCurrencyQuickSwitch(curr)}
                          className={cn(
                            'rounded-lg px-2.5 py-1 font-mono text-[11px] font-black transition-all',
                            selectedCurrency === curr
                              ? curr === 'YER'
                                ? 'bg-amber-500 text-white shadow-sm'
                                : curr === 'SAR'
                                  ? 'bg-emerald-600 text-white shadow-sm'
                                  : 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                          )}
                        >
                          {curr === 'YER'
                            ? 'YER (ريال يمني)'
                            : curr === 'SAR'
                              ? 'SAR (سعودي)'
                              : curr}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">عملات أخرى:</span>
                    <div className="relative">
                      <select
                        {...register('currency_code')}
                        onChange={e => handleCurrencyQuickSwitch(e.target.value)}
                        className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1 pr-6 text-xs font-bold text-slate-800 outline-none hover:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        <option value="SAR">SAR</option>
                        <option value="YER">YER</option>
                        {currencies.data
                          ?.filter((c: any) => c.code !== 'SAR' && c.code !== 'YER')
                          .map((c: any) => (
                            <option key={c.code} value={c.code}>
                              {c.code}
                            </option>
                          ))}
                      </select>
                      <Tag
                        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400"
                        size={11}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-4 lg:flex-row lg:items-center">
                  {/* Primary Amount Input */}
                  <div className="relative w-full flex-1">
                    <div className="mb-1 flex items-center justify-between">
                      <label
                        className={cn(
                          'inline-block rounded-t-xl px-3 py-0.5 text-xs font-black uppercase tracking-widest',
                          type === 'receipt'
                            ? 'bg-emerald-600 text-white'
                            : type === 'transfer'
                              ? 'bg-blue-600 text-white'
                              : 'bg-rose-600 text-white'
                        )}
                      >
                        المبلغ المطلوب ({selectedCurrency})
                      </label>
                      {selectedCurrency === 'YER' && (
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                          ⚡ دعم مبالغ الريال اليمني الكبيرة
                        </span>
                      )}
                    </div>
                    <div className="group relative">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={amountInputStr}
                        onChange={handleAmountChange}
                        placeholder="0.00"
                        className={cn(
                          'w-full rounded-2xl border-2 bg-white px-4 py-3 font-mono text-2xl font-black outline-none transition-all dark:bg-slate-950 sm:px-5 sm:py-3.5 sm:text-3xl',
                          type === 'receipt'
                            ? 'border-emerald-200 text-emerald-600 focus:border-emerald-500 dark:border-emerald-800/50'
                            : type === 'transfer'
                              ? 'border-blue-200 text-blue-600 focus:border-blue-500 dark:border-blue-800/50'
                              : 'border-rose-200 text-rose-600 focus:border-rose-500 dark:border-rose-800/50'
                        )}
                      />
                      <DollarSign
                        className={cn(
                          'absolute left-4 top-1/2 -translate-y-1/2 opacity-20 sm:left-5',
                          type === 'receipt'
                            ? 'text-emerald-600'
                            : type === 'transfer'
                              ? 'text-blue-600'
                              : 'text-rose-600'
                        )}
                        size={26}
                      />
                    </div>

                    {/* Instant Tafqeet & Digit Formatting */}
                    {enteredAmount > 0 && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-white/80 px-2 py-0.5 font-mono text-[11px] font-black text-slate-800 shadow-sm dark:bg-slate-800 dark:text-slate-100">
                          {formatNumber(enteredAmount)} {selectedCurrency}
                        </span>
                        {tafqeetText && (
                          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            ({tafqeetText})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Foreign Currency & Auto Exchange Rate Controls */}
                  {selectedCurrency !== 'SAR' && (
                    <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-850 sm:w-auto sm:flex-row">
                      {/* Exchange Rate Input */}
                      <div className="w-full sm:w-36">
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                            سعر الصرف {isDivide ? '(÷)' : '(×)'}
                          </label>
                          {selectedCurrency === 'YER' && (
                            <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                              YER
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={rateInputStr}
                          onChange={handleRateChange}
                          placeholder="1.0"
                          className="w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-2 py-1.5 text-center font-mono text-xs font-black text-slate-800 outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                        {selectedCurrency === 'YER' && (
                          <div className="mt-0.5 text-center font-mono text-[10px] font-bold text-slate-400">
                            1 ر.س = {rateInputStr || '410'} ر.ي
                          </div>
                        )}
                      </div>

                      {/* Equivalent in Base Currency (SAR) with Auto-Rate Button */}
                      <div className="w-full sm:w-44">
                        <div className="mb-1 flex items-center justify-between">
                          <label className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
                            المقابل (SAR)
                          </label>
                          <button
                            type="button"
                            onClick={handleCalculateRateFromEquivalent}
                            title="حساب سعر الصرف تلقائياً من المقابل"
                            className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                          >
                            <Calculator size={11} />
                            <span>احسب الصرف</span>
                          </button>
                        </div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={equivalentSarInputStr}
                          onChange={handleEquivalentSarChange}
                          placeholder="0.00"
                          className="w-full rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/60 px-2 py-1.5 text-center font-mono text-xs font-black text-blue-700 outline-none transition-colors focus:border-blue-500 dark:border-blue-800/60 dark:bg-blue-900/20 dark:text-blue-300"
                        />
                        <div className="mt-0.5 text-center text-[10px] text-slate-400">
                          {formatCurrency(watch('amount') || 0)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Presets row adaptive to currency */}
                <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200/50 pt-2 dark:border-slate-800/50">
                  <span className="ml-1 text-[10px] font-bold text-slate-400">
                    إضافة سريعة ({selectedCurrency}):
                  </span>
                  {(selectedCurrency === 'YER'
                    ? [10000, 50000, 100000, 500000, 1000000, 5000000]
                    : [100, 500, 1000, 5000, 10000]
                  ).map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => handleQuickAmount(val)}
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[11px] font-bold text-slate-600 transition-all hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      +{val >= 1000000 ? `${val / 1000000}M` : val >= 1000 ? `${val / 1000}K` : val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleClearAmount}
                    className="mr-auto rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-600 transition-all hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400"
                  >
                    تصفير
                  </button>
                </div>
              </div>

              {/* Accounts & Parties Selection Section */}
              <div className="space-y-4 rounded-2xl border border-gray-100 bg-[var(--app-surface)] p-4 shadow-sm dark:border-slate-800 sm:rounded-3xl sm:p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-50 p-1 px-3 text-[10px] font-black uppercase tracking-tighter text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                      أطراف المعاملة والحسابات
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">طريقة الدفع:</span>
                    <select
                      {...register('payment_method')}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      <option value="cash">نقداً</option>
                      <option value="bank">حوالة بنكية / شيك</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div
                    className={cn(
                      'flex h-11 rounded-2xl border bg-slate-50 p-1.5 dark:border-slate-800 dark:bg-slate-950',
                      type === 'transfer' && 'pointer-events-none opacity-50'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setValue('counterparty_type', 'party');
                      }}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-xl text-[11px] font-black transition-all',
                        counterpartyType === 'party'
                          ? 'bg-white text-blue-600 shadow-md dark:bg-slate-700'
                          : 'text-gray-400 hover:text-gray-500'
                      )}
                    >
                      <Building size={14} /> جهة (عميل / مورد)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setValue('counterparty_type', 'account');
                      }}
                      className={cn(
                        'flex flex-1 items-center justify-center gap-2 rounded-xl text-[11px] font-black transition-all',
                        counterpartyType === 'account'
                          ? 'bg-white text-blue-600 shadow-md dark:bg-slate-700'
                          : 'text-gray-400 hover:text-gray-500'
                      )}
                    >
                      <Landmark size={14} /> حساب عام من الدليل
                    </button>
                  </div>

                  {counterpartyType === 'party' ? (
                    <div className="space-y-3">
                      <div className="group relative">
                        <input
                          type="text"
                          value={partyQuery}
                          onChange={e => {
                            setPartyQuery(e.target.value);
                            setShowPartyDropdown(true);
                          }}
                          onFocus={() => {
                            if (parties.length > 0) setShowPartyDropdown(true);
                          }}
                          placeholder={
                            type === 'receipt'
                              ? 'ابحث بالاسم أو الهاتف عن العميل...'
                              : 'ابحث بالاسم أو الهاتف عن المورد...'
                          }
                          className="w-full rounded-2xl border-2 border-transparent bg-slate-50 p-3.5 pl-12 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500/30 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-500/20"
                        />
                        <Search
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-blue-500"
                          size={18}
                        />
                        {showPartyDropdown && partyQuery.length > 0 && parties.length > 0 && (
                          <div className="animate-in fade-in zoom-in-95 absolute z-30 mt-2 max-h-56 w-full overflow-auto rounded-2xl border bg-white shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-800">
                            {parties.map((p: any) => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  handlePartySelect(p);
                                }}
                                className="flex cursor-pointer items-center justify-between border-b p-3.5 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/50"
                              >
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-gray-800 dark:text-slate-100">
                                    {p.name}
                                  </span>
                                  <span className="font-mono text-[10px] font-bold text-gray-400">
                                    {p.code || p.phone || p.id.split('-')[0]}
                                  </span>
                                </div>
                                <span
                                  className={cn(
                                    'rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm',
                                    p.type === 'customer'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30'
                                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                                  )}
                                >
                                  {p.type === 'customer' ? 'عميل' : 'مورد'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <AccountSelector
                      label={
                        type === 'transfer'
                          ? 'الحساب المحول إليه (الهدف)'
                          : 'الحساب المقابل في القيد'
                      }
                      icon={Landmark}
                      {...register('counterparty_id', { required: true })}
                    >
                      <option value="">
                        -- اختر الحساب {type === 'transfer' ? 'الهدف' : ''} --
                      </option>
                      {type === 'transfer'
                        ? cashAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </option>
                          ))
                        : otherAccounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.code} - {acc.name}
                            </option>
                          ))}
                    </AccountSelector>
                  )}
                </div>

                <AccountSelector
                  label={
                    type === 'transfer' ? 'الحساب المحول منه (المصدر)' : 'حساب الصندوق أو البنك'
                  }
                  icon={Wallet}
                  {...register('cash_account_id', { required: true })}
                >
                  <option value="">
                    -- اختر الصندوق أو البنك {type === 'transfer' ? 'المصدر' : ''} --
                  </option>
                  {cashAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.code} - {acc.name}
                    </option>
                  ))}
                </AccountSelector>
              </div>

              {/* Step 2: Date, Reference & Description */}
              <div className="space-y-4 rounded-2xl border border-gray-100 bg-[var(--app-surface)] p-4 shadow-sm dark:border-slate-800 sm:rounded-3xl sm:p-6">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-amber-50 p-1 px-3 text-[10px] font-black uppercase tracking-tighter text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                    بيانات السند المرجعية والشرح
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-gray-400">
                        تاريخ السند
                      </span>
                      <button
                        type="button"
                        onClick={() => setValue('date', formatLocalDate())}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        تاريخ اليوم
                      </button>
                    </div>
                    <Input
                      type="date"
                      {...register('date', { required: true })}
                      dir="ltr"
                      icon={<Calendar className="text-gray-400" />}
                    />
                  </div>
                  <div>
                    <span className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                      رقم المرجع (يدوي/إيصال)
                    </span>
                    <Input
                      placeholder="مثال: REC-9821"
                      {...register('reference_number')}
                      dir="ltr"
                      icon={<FileText className="text-gray-400" />}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    البيان (شرح السند المحاسبي)
                  </label>
                  <div className="group relative">
                    <textarea
                      {...register('description', { required: true })}
                      rows={2}
                      placeholder="اكتب شرحاً واضحاً للعملية المالية لتوثيقها في دفتر الأستاذ..."
                      className="w-full resize-none rounded-2xl border-2 border-transparent bg-slate-50 p-3.5 text-sm font-bold text-slate-800 outline-none transition-all placeholder:text-gray-400 focus:border-blue-500/30 dark:bg-slate-800 dark:text-slate-100"
                    ></textarea>
                    <Tag
                      className="absolute bottom-3 left-3 text-gray-400 transition-colors group-focus-within:text-blue-500"
                      size={16}
                    />
                  </div>
                </div>
              </div>

              {/* Commission / Discount (Optional) */}
              {(type === 'receipt' || type === 'payment') && (
                <div className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50/30 p-4 shadow-sm dark:border-amber-900/30 dark:bg-amber-900/10">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-amber-100 p-1.5 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                      <Tag size={14} />
                    </div>
                    <div className="text-xs font-bold text-amber-900 dark:text-amber-100">
                      {type === 'receipt'
                        ? 'إضافة عمولة أو خصم مسموح به للعميل (اختياري)'
                        : 'توثيق خصم مكتسب من المورد (اختياري)'}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        مبلغ الخصم / العمولة
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={commissionInputStr}
                          onChange={handleCommissionChange}
                          className="w-full rounded-xl border-2 border-gray-100 bg-white p-2.5 pr-9 font-mono text-xs font-bold outline-none focus:border-amber-500/50 dark:border-slate-700 dark:bg-slate-800"
                          placeholder="0.00"
                        />
                        <DollarSign
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={14}
                        />
                      </div>
                    </div>
                    <AccountSelector
                      label="حساب توجيه الخصم"
                      icon={Landmark}
                      {...register('commission_account_id')}
                    >
                      <option value="">-- اختر الحساب المحاسبي --</option>
                      {otherAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </option>
                      ))}
                    </AccountSelector>
                  </div>
                </div>
              )}
            </div>

            {/* Left Column: Unpaid Invoices, Live Journal Simulation & Summary (5 columns on desktop) */}
            <div className="space-y-5 lg:col-span-5">
              {/* Unpaid Invoices */}
              {(type === 'receipt' || type === 'payment') &&
                counterpartyId &&
                counterpartyType === 'party' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <PartyInvoicesList
                      partyId={counterpartyId}
                      partyType={type === 'receipt' ? 'customer' : 'supplier'}
                      selectedInvoiceId={selectedInvoiceId}
                      onSelectInvoice={handleInvoiceSelect}
                    />
                  </div>
                )}

              {/* Live Journal Simulation Card (محاكي القيد المحاسبي المباشر) */}
              <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:rounded-3xl sm:p-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-50 p-1.5 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        محاكي القيد المحاسبي المتولد
                      </h4>
                      <p className="text-[10px] text-slate-400">
                        معاينة حركة الحسابات الآلية الناتجة عن السند
                      </p>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    مباشر (Live)
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {/* Debit Side */}
                  <div className="flex items-center justify-between rounded-xl border border-emerald-100/60 bg-emerald-50/60 p-2.5 dark:border-emerald-900/30 dark:bg-emerald-950/20">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white">
                        مدين
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {type === 'receipt'
                          ? selectedCashAccount?.name || 'حساب الصندوق / البنك'
                          : type === 'payment'
                            ? selectedParty?.name ||
                              selectedCounterpartyAccount?.name ||
                              'حساب المورد / المصروف'
                            : selectedCounterpartyAccount?.name || 'حساب الخزينة المحول إليها'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(enteredAmount, selectedCurrency)}
                    </span>
                  </div>

                  {/* Commission/Discount Debit if receipt */}
                  {type === 'receipt' && commissionAmount > 0 && (
                    <div className="flex items-center justify-between rounded-xl border border-amber-100/60 bg-amber-50/60 p-2.5 dark:border-amber-900/30 dark:bg-amber-950/20">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-amber-600 px-2 py-0.5 text-[10px] font-black text-white">
                          مدين
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {selectedCommissionAccount?.name || 'خصم مسموح به'}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-amber-700 dark:text-amber-400">
                        {formatCurrency(commissionAmount, selectedCurrency)}
                      </span>
                    </div>
                  )}

                  {/* Credit Side */}
                  <div className="flex items-center justify-between rounded-xl border border-rose-100/60 bg-rose-50/60 p-2.5 dark:border-rose-900/30 dark:bg-rose-950/20">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">
                        دائن
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {type === 'receipt'
                          ? selectedParty?.name ||
                            selectedCounterpartyAccount?.name ||
                            'حساب العميل'
                          : type === 'payment'
                            ? selectedCashAccount?.name || 'حساب الصندوق / البنك'
                            : selectedCashAccount?.name || 'حساب الخزينة المحول منها'}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                      {formatCurrency(
                        type === 'receipt' && commissionAmount > 0
                          ? enteredAmount + commissionAmount
                          : enteredAmount,
                        selectedCurrency
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Executive Summary Card */}
              <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/30 sm:rounded-3xl sm:p-5">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">
                  ملخص السند قبل الاعتماد
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500">
                    <span>نوع العملية:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{theme.title}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>الطرف المقابل:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {counterpartyType === 'party'
                        ? selectedParty?.name || 'لم يُحدد بعد'
                        : selectedCounterpartyAccount?.name || 'لم يُحدد بعد'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-500">
                    <span>الصندوق / البنك:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {selectedCashAccount?.name || 'لم يُحدد بعد'}
                    </span>
                  </div>
                  {selectedInvoiceId && (
                    <div className="flex items-center justify-between text-slate-500">
                      <span>الفاتورة المرتبطة:</span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        نعم (محددة للسداد)
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-700">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      المبلغ الصافي:
                    </span>
                    <span
                      className={cn(
                        'font-mono text-base font-black',
                        type === 'receipt' ? 'text-emerald-600' : 'text-rose-600'
                      )}
                    >
                      {formatCurrency(enteredAmount, selectedCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default CreateBondModal;
