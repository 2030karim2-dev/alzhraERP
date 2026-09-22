import React, { useState } from 'react';
import { Calendar, FileText, Maximize2, Minimize2, Tag, DollarSign } from 'lucide-react';
import type { BondFormData, BondType } from '../types';
import { useBondForm, type BondPrefill } from '../hooks/useBondForm';

import Modal from '../../../ui/base/Modal';
import { BondModalFooter } from './BondModalFooter';
import Input from '../../../ui/base/Input';
import { cn, formatLocalDate } from '../../../core/utils';
import PartyInvoicesList from './PartyInvoicesList';
import { BondAmountSection } from './BondAmountSection';
import { BondPartySection, AccountSelector } from './BondPartySection';
import { BondJournalPreview } from './BondJournalPreview';
import { BondSummary } from './BondSummary';

interface CreateBondModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: BondType;
  onSubmit: (data: BondFormData) => void;
  isSubmitting: boolean;
  defaultAccountId?: string | null;
  /** تعبئة مسبقة (منظومة الديون): طرف/مبلغ/عملة/فاتورة — كائن ثابت الهوية. */
  prefill?: BondPrefill | null;
}

/* eslint-disable max-lines-per-function, complexity -- modal composition hub: binds useBondForm state to four presentational sections (per-section JSX lives in dedicated components); the remaining complexity is prop passthrough + conditional sections, not branching logic. */
const CreateBondModal: React.FC<CreateBondModalProps> = ({
  isOpen,
  onClose,
  type,
  onSubmit,
  isSubmitting,
  defaultAccountId,
  prefill,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(true);

  const bond = useBondForm(isOpen, type, defaultAccountId, onSubmit, prefill);
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
    <BondModalFooter
      type={type}
      loading={isSubmitting}
      onCancel={onClose}
      onSave={() => {
        void handleSubmit(onValidSubmit)();
      }}
    />
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
            onClick={() => {
              setIsFullscreen(!isFullscreen);
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? 'استعادة الحجم المخصص' : 'توسيع إلى ملء الشاشة'}</span>
          </button>
        </div>

        <form
          onSubmit={e => {
            void handleSubmit(onValidSubmit)(e);
          }}
          className="w-full"
        >
          {/* Main Desktop 2-Column Split Workspace */}
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
            {/* Right Column: Primary Bond Entry Inputs (7 columns on desktop) */}
            <div className="space-y-5 lg:col-span-7">
              {/* Step 1: Head - Amount & Currency & Quick Presets */}
              <BondAmountSection
                type={type}
                register={register}
                watch={watch}
                currencies={currencies}
                selectedCurrency={selectedCurrency}
                amountInputStr={amountInputStr}
                rateInputStr={rateInputStr}
                equivalentSarInputStr={equivalentSarInputStr}
                isDivide={isDivide}
                enteredAmount={enteredAmount}
                tafqeetText={tafqeetText}
                handleAmountChange={handleAmountChange}
                handleRateChange={handleRateChange}
                handleEquivalentSarChange={handleEquivalentSarChange}
                handleCalculateRateFromEquivalent={handleCalculateRateFromEquivalent}
                handleCurrencyQuickSwitch={handleCurrencyQuickSwitch}
                handleQuickAmount={handleQuickAmount}
                handleClearAmount={handleClearAmount}
              />

              {/* Accounts & Parties Selection Section */}
              <BondPartySection
                type={type}
                register={register}
                setValue={setValue}
                counterpartyType={counterpartyType}
                partyQuery={partyQuery}
                setPartyQuery={setPartyQuery}
                showPartyDropdown={showPartyDropdown}
                setShowPartyDropdown={setShowPartyDropdown}
                parties={parties}
                cashAccounts={cashAccounts}
                otherAccounts={otherAccounts}
                handlePartySelect={handlePartySelect}
              />

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
                        onClick={() => {
                          setValue('date', formatLocalDate());
                        }}
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
                  <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    البيان (شرح السند المحاسبي)
                  </span>
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
                      <span className="px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        مبلغ الخصم / العمولة
                      </span>
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
                      icon={Tag}
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
                counterpartyType === 'party' &&
                counterpartyId !== '' && (
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
              <BondJournalPreview
                type={type}
                enteredAmount={enteredAmount}
                commissionAmount={commissionAmount}
                selectedCurrency={selectedCurrency}
                selectedCashAccount={selectedCashAccount}
                selectedCounterpartyAccount={selectedCounterpartyAccount}
                selectedParty={selectedParty}
                selectedCommissionAccount={selectedCommissionAccount}
              />

              {/* Executive Summary Card */}
              <BondSummary
                type={type}
                themeTitle={theme.title}
                counterpartyType={counterpartyType}
                enteredAmount={enteredAmount}
                selectedCurrency={selectedCurrency}
                selectedCashAccount={selectedCashAccount}
                selectedCounterpartyAccount={selectedCounterpartyAccount}
                selectedParty={selectedParty}
                selectedInvoiceId={selectedInvoiceId}
              />
            </div>
          </div>
        </form>
      </div>
    </Modal>
  );
};

/* eslint-enable max-lines-per-function, complexity */

export default CreateBondModal;
