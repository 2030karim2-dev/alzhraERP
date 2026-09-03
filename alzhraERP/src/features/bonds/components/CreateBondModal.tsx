import { logger } from '../../../core/utils/logger';

import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import {
  DollarSign,
  Calendar,
  FileText,
  ArrowDown,
  ArrowUpCircle,
  ArrowRightLeft,
  Search,
  Landmark,
  Save,
  Tag,
  Building,
  Wallet,
} from 'lucide-react';
import type { BondFormData, BondType } from '../types';
// Fix: Corrected import path to point to the barrel file.
import { useAccounts } from '../../accounting/hooks/index';
import { useCurrencies } from '../../settings/hooks';
import { useParties } from '../../parties/hooks';

import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import { cn, formatCurrency, formatLocalDate } from '../../../core/utils';
import { convertToBaseCurrency } from '../../../core/utils/currencyUtils';
import { createIdempotencyKey } from '../../../core/utils/idempotency';

interface CreateBondModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: BondType;
  onSubmit: (data: BondFormData) => void;
  isSubmitting: boolean;
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
        className="w-full appearance-none rounded-xl border-2 border-gray-100 bg-white p-3 pr-10 text-sm font-bold outline-none focus:border-blue-500/50 dark:border-slate-700 dark:bg-slate-800"
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
}) => {
  const { data: allAccounts, isLoading: _isLoadingAccounts } = useAccounts();
  const { currencies, rates } = useCurrencies();
  const [partyQuery, setPartyQuery] = useState('');

  const { data: allParties } = useParties(type === 'receipt' ? 'customer' : 'supplier', partyQuery);

  const parties = useMemo(() => {
    return allParties || [];
  }, [allParties]);

  const idempotencyKeyRef = React.useRef(createIdempotencyKey('bond'));

  const { register, handleSubmit, reset, watch, setValue } = useForm<BondFormData>({
    defaultValues: {
      type,
      date: formatLocalDate(),
      currency_code: 'SAR',
      exchange_rate: 1,
      counterparty_type: type === 'transfer' ? 'account' : 'party',
      payment_method: 'cash',
    },
  });

  const selectedCurrency = watch('currency_code');
  const counterpartyType = watch('counterparty_type');
  const currencyObj = currencies.data?.find(
    (c: { code: string; exchange_operator?: string }) => c.code === selectedCurrency
  );
  const isDivide = currencyObj?.exchange_operator === 'divide';

  useEffect(() => {
    if (isOpen) {
      idempotencyKeyRef.current = createIdempotencyKey('bond');
      reset({
        type,
        date: formatLocalDate(),
        currency_code: 'SAR',
        exchange_rate: 1,
        counterparty_type: type === 'transfer' ? 'account' : 'party',
        payment_method: 'cash',
      });
      setPartyQuery('');
    }
  }, [isOpen, type, reset]);

  useEffect(() => {
    if (selectedCurrency === 'SAR') {
      setValue('exchange_rate', 1);
      setValue('foreign_amount', 0);
    } else {
      const rate = rates.data?.find(
        (r: { currency_code: string; rate_to_base: number }) => r.currency_code === selectedCurrency
      );
      if (rate) setValue('exchange_rate', rate.rate_to_base);
    }
  }, [selectedCurrency, rates.data, setValue]);

  const foreignAmount = watch('foreign_amount');
  const exchangeRate = watch('exchange_rate');

  useEffect(() => {
    if (selectedCurrency !== 'SAR' && foreignAmount && exchangeRate) {
      try {
        const baseAmount = convertToBaseCurrency({
          amount: foreignAmount,
          currencyCode: selectedCurrency,
          exchangeRate: exchangeRate,
          exchangeOperator: (currencyObj?.exchange_operator as 'multiply' | 'divide') || 'multiply',
        });
        setValue('amount', baseAmount);
      } catch (e) {
        logger.error('CreateBondModal', 'Conversion failed', e);
      }
    }
  }, [selectedCurrency, foreignAmount, exchangeRate, currencyObj, setValue]);

  const { cashAccounts, otherAccounts } = useMemo(() => {
    const cash = allAccounts?.filter(acc => acc.code.startsWith('10')) || [];
    const others = allAccounts?.filter(acc => !acc.code.startsWith('10')) || [];
    return { cashAccounts: cash, otherAccounts: others };
  }, [allAccounts]);

  const handlePartySelect = (party: any) => {
    setValue('counterparty_id', party.id);
    setPartyQuery(party.name);
  };

  const theme =
    type === 'receipt'
      ? {
          color: 'emerald',
          icon: ArrowDown,
          title: 'سند قبض جديد',
          description: 'تسجيل عملية قبض نقدية أو بنكية',
        }
      : type === 'transfer'
        ? {
            color: 'blue',
            icon: ArrowRightLeft,
            title: 'تحويل داخلي جديد',
            description: 'تحويل مبالغ بين الخزائن والحسابات البنكية',
          }
        : {
            color: 'rose',
            icon: ArrowUpCircle,
            title: 'سند صرف جديد',
            description: 'تسجيل عملية صرف نقدية أو بنكية',
          };

  const footer = (
    <div className="flex w-full gap-3 p-1">
      <Button
        onClick={onClose}
        variant="outline"
        className="flex-1 py-6 text-xs font-bold uppercase transition-all hover:bg-gray-100 dark:hover:bg-slate-800"
      >
        إلغاء
      </Button>
      <Button
        onClick={handleSubmit(data => {
          onSubmit({ ...data, idempotency_key: idempotencyKeyRef.current });
        })}
        isLoading={isSubmitting}
        disabled={isSubmitting}
        variant={type === 'receipt' ? 'success' : type === 'transfer' ? 'primary' : 'danger'}
        className="group flex-[2] py-6 text-xs font-bold uppercase shadow-xl shadow-blue-500/10"
        leftIcon={<Save size={18} className="transition-transform group-hover:scale-110" />}
      >
        اعتماد السند وحفظه
      </Button>
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
      size="full"
    >
      <form className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
        {/* Step 1: Head - Amount & Currency */}
        <div
          className={cn(
            'flex flex-col items-center gap-4 rounded-2xl border-2 p-4 shadow-md transition-all sm:gap-8 sm:rounded-3xl sm:p-8 md:flex-row',
            type === 'receipt'
              ? 'border-emerald-100 bg-emerald-50/40 dark:border-emerald-800/20 dark:bg-emerald-900/10'
              : type === 'transfer'
                ? 'border-blue-100 bg-blue-50/40 dark:border-blue-800/20 dark:bg-blue-900/10'
                : 'border-rose-100 bg-rose-50/40 dark:border-rose-800/20 dark:bg-rose-900/10'
          )}
        >
          <div className="relative w-full flex-1">
            <label
              className={cn(
                'mb-0.5 inline-block rounded-t-xl px-3 py-1 text-xs font-black uppercase tracking-widest',
                type === 'receipt'
                  ? 'bg-emerald-600 text-white'
                  : type === 'transfer'
                    ? 'bg-blue-600 text-white'
                    : 'bg-rose-600 text-white'
              )}
            >
              المبلغ {selectedCurrency}
            </label>
            <div className="group relative">
              <input
                type="number"
                step="0.01"
                {...register(selectedCurrency === 'SAR' ? 'amount' : 'foreign_amount', {
                  required: true,
                  valueAsNumber: true,
                  min: 0.01,
                })}
                className={cn(
                  'w-full rounded-2xl border-2 bg-white px-4 py-3 font-mono text-2xl font-black outline-none transition-all dark:bg-slate-950 sm:px-8 sm:py-5 sm:text-4xl lg:text-5xl',
                  type === 'receipt'
                    ? 'border-emerald-200 text-emerald-600 focus:border-emerald-500 dark:border-emerald-800/50'
                    : type === 'transfer'
                      ? 'border-blue-200 text-blue-600 focus:border-blue-500 dark:border-blue-800/50'
                      : 'border-rose-200 text-rose-600 focus:border-rose-500 dark:border-rose-800/50'
                )}
                placeholder="0.00"
              />
              <DollarSign
                className={cn(
                  'absolute left-4 top-1/2 -translate-y-1/2 opacity-20 sm:left-6',
                  type === 'receipt'
                    ? 'text-emerald-600'
                    : type === 'transfer'
                      ? 'text-blue-600'
                      : 'text-rose-600'
                )}
                size={32}
              />
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-[var(--app-surface)] p-3.5 shadow-xl dark:border-slate-800 sm:gap-6 sm:rounded-3xl sm:p-6 md:w-auto md:flex-row">
            <div className="w-full md:w-32">
              <label className="mb-2 block text-center text-[10px] font-bold uppercase text-gray-400">
                العملة
              </label>
              <div className="relative">
                <select
                  {...register('currency_code')}
                  className="w-full cursor-pointer appearance-none rounded-xl border-2 bg-slate-50 px-4 py-3 text-center text-sm font-black outline-none transition-colors hover:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="SAR">SAR</option>
                  {currencies.data
                    ?.filter((c: any) => c.code !== 'SAR')
                    .map((c: any) => (
                      <option key={c.code} value={c.code}>
                        {c.code}
                      </option>
                    ))}
                </select>
                <Tag
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={14}
                />
              </div>
            </div>

            {selectedCurrency !== 'SAR' && (
              <>
                <div className="w-full md:w-40">
                  <label className="mb-2 block text-center text-[10px] font-bold uppercase text-gray-400">
                    سعر الصرف {isDivide ? '÷' : '×'}
                  </label>
                  <div className="group relative">
                    <input
                      type="number"
                      step="0.000001"
                      {...register('exchange_rate', { required: true, valueAsNumber: true })}
                      className="w-full rounded-xl border-2 bg-slate-50 px-4 py-3 text-center font-mono text-sm font-black outline-none transition-colors focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
                    />
                  </div>
                </div>

                <div className="w-full md:w-44">
                  <label className="mb-2 block text-center text-[10px] font-bold uppercase text-gray-400">
                    المقابل بالريال (SAR)
                  </label>
                  <div className="w-full rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 px-4 py-3 text-center font-mono text-sm font-black text-blue-600 dark:border-blue-800/50 dark:bg-blue-900/10 dark:text-blue-400">
                    {formatCurrency(watch('amount') || 0)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step 2: Grid for Details */}
        <div className="grid grid-cols-1 gap-3.5 sm:gap-6 md:grid-cols-2">
          {/* Account/Party Section */}
          <div className="space-y-3.5 sm:space-y-6">
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-[var(--app-surface)] p-3.5 shadow-sm dark:border-slate-800 sm:space-y-5 sm:rounded-3xl sm:p-6">
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-lg bg-blue-50 p-1 px-3 text-[10px] font-black uppercase tracking-tighter text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
                  الحسابات والجهات
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
                      'flex flex-1 items-center justify-center gap-2 rounded-xl text-[10px] font-black transition-all',
                      counterpartyType === 'party'
                        ? 'bg-white text-blue-600 shadow-md dark:bg-slate-700'
                        : 'text-gray-400 hover:text-gray-500'
                    )}
                  >
                    <Building size={14} /> جهة (عميل/مورد)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('counterparty_type', 'account');
                    }}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-2 rounded-xl text-[10px] font-black transition-all',
                      counterpartyType === 'account'
                        ? 'bg-white text-blue-600 shadow-md dark:bg-slate-700'
                        : 'text-gray-400 hover:text-gray-500'
                    )}
                  >
                    <Landmark size={14} /> حساب عام
                  </button>
                </div>

                {counterpartyType === 'party' ? (
                  <div className="group relative">
                    <input
                      type="text"
                      value={partyQuery}
                      onChange={e => {
                        setPartyQuery(e.target.value);
                      }}
                      placeholder="ابحث عن العميل أو المورد..."
                      className="w-full rounded-2xl border-2 border-transparent bg-slate-50 p-4 pl-12 text-sm font-bold outline-none transition-all placeholder:text-gray-300 focus:border-blue-500/30 dark:bg-slate-800 dark:focus:border-blue-500/20"
                    />
                    <Search
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors group-focus-within:text-blue-500"
                      size={20}
                    />
                    {partyQuery.length > 1 && parties.length > 0 && (
                      <div className="animate-in fade-in zoom-in-95 absolute z-20 mt-2 max-h-56 w-full overflow-auto rounded-2xl border bg-white shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-800">
                        {parties.map((p: any) => (
                          <div
                            key={p.id}
                            onClick={() => {
                              handlePartySelect(p);
                            }}
                            className="flex cursor-pointer items-center justify-between border-b p-4 transition-colors last:border-0 hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-slate-700/50"
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-800 dark:text-slate-100">
                                {p.name}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400">
                                {p.code || p.phone || p.id.split('-')[0]}
                              </span>
                            </div>
                            <span
                              className={cn(
                                'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest shadow-sm',
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
                ) : (
                  <AccountSelector
                    label={type === 'transfer' ? 'الحساب المحول إليه' : 'الحساب المقابل'}
                    icon={Landmark}
                    {...register('counterparty_id', { required: true })}
                  >
                    <option value="">-- اختر الحساب {type === 'transfer' ? 'الهدف' : ''} --</option>
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
                label={type === 'transfer' ? 'الحساب المحول منه' : 'الصندوق أو البنك'}
                icon={Wallet}
                {...register('cash_account_id', { required: true })}
              >
                <option value="">-- اختر الحساب {type === 'transfer' ? 'المصدر' : ''} --</option>
                {cashAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.code} - {acc.name}
                  </option>
                ))}
              </AccountSelector>
            </div>
          </div>

          {/* Reference & Info Section */}
          <div className="space-y-3.5 sm:space-y-6">
            <div className="h-full flex-1 space-y-4 rounded-2xl border border-gray-100 bg-[var(--app-surface)] p-3.5 shadow-sm dark:border-slate-800 sm:space-y-6 sm:rounded-3xl sm:p-6">
              <div className="mb-2 flex items-center gap-2">
                <div className="rounded-lg bg-amber-50 p-1 px-3 text-[10px] font-black uppercase tracking-tighter text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                  بيانات إضافية
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="تاريخ السند"
                  type="date"
                  {...register('date', { required: true })}
                  dir="ltr"
                  icon={<Calendar className="text-gray-400" />}
                />
                <Input
                  label="رقم المرجع (يدوي)"
                  {...register('reference_number')}
                  dir="ltr"
                  icon={<FileText className="text-gray-400" />}
                />
              </div>

              <div className="space-y-1.5">
                <label className="px-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  البيان (شرح السند)
                </label>
                <div className="group relative">
                  <textarea
                    {...register('description', { required: true })}
                    className="min-h-[100px] w-full resize-none rounded-2xl border-2 border-transparent bg-slate-50 p-4 text-sm font-bold outline-none transition-all placeholder:text-gray-300 focus:border-blue-500/30 dark:bg-slate-800"
                  ></textarea>
                  <Tag
                    className="absolute bottom-4 left-4 text-gray-300 transition-colors group-focus-within:text-blue-500"
                    size={20}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CreateBondModal;
