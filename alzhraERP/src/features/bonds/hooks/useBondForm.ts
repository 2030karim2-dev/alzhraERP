/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/restrict-template-expressions, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unnecessary-type-conversion */
import { logger } from '../../../core/utils/logger';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { ArrowDown, ArrowRightLeft, ArrowUpCircle } from 'lucide-react';
import type { BondFormData, BondType } from '../types';
import { useAccounts } from '../../accounting/hooks/index';
import { useCurrencies } from '../../settings/hooks';
import { useParties } from '../../parties/hooks';
import { useFeedbackStore } from '../../feedback/store';
import { formatLocalDate } from '../../../core/utils';
import {
  convertToBaseCurrency,
  ensureLatinDigits,
  sanitizeNumericInput,
} from '../../../core/utils/currencyUtils';
import { tafqeet } from '../../../core/utils/tafqeet';
import { createIdempotencyKey } from '../../../core/utils/idempotency';

/**
 * useBondForm — عزل كامل لمنطق نموذج السندات:
 * - تطهير ومنع الأرقام العربية وتحويلها لحظياً
 * - إدارة الريال اليمني (YER) والعملات الأخرى
 * - الحساب التلقائي لسعر الصرف والمعادل
 * - التدقيق المالي الصارم
 */
export function useBondForm(
  isOpen: boolean,
  type: BondType,
  defaultAccountId: string | null | undefined,
  onSubmit: (data: BondFormData) => void
) {
  const { data: allAccounts, isLoading: _isLoadingAccounts } = useAccounts();
  const { currencies, rates } = useCurrencies();
  const { showToast } = useFeedbackStore();
  const [partyQuery, setPartyQuery] = useState('');
  const [showPartyDropdown, setShowPartyDropdown] = useState(false);

  // Controlled String States for strict English digits sanitization (No Arabic numerals)
  const [amountInputStr, setAmountInputStr] = useState<string>('');
  const [rateInputStr, setRateInputStr] = useState<string>('1');
  const [equivalentSarInputStr, setEquivalentSarInputStr] = useState<string>('');
  const [commissionInputStr, setCommissionInputStr] = useState<string>('');

  const { data: allParties } = useParties('all', partyQuery);

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
      cash_account_id: defaultAccountId || '',
    },
  });

  const selectedCurrency = watch('currency_code');
  const counterpartyType = watch('counterparty_type');
  const counterpartyId = watch('counterparty_id');
  const selectedInvoiceId = watch('invoice_id');
  const cashAccountId = watch('cash_account_id');
  const enteredAmount = watch(selectedCurrency === 'SAR' ? 'amount' : 'foreign_amount') || 0;
  const commissionAmount = watch('commission_amount') || 0;
  const commissionAccountId = watch('commission_account_id');

  const currencyObj = currencies.data?.find(
    (c: { code: string; exchange_operator?: string }) => c.code === selectedCurrency
  );
  const isDivide = currencyObj?.exchange_operator === 'divide';

  // Tafqeet text for quick confirmation
  const tafqeetText = useMemo(() => {
    if (!enteredAmount || enteredAmount <= 0) return '';
    const label =
      selectedCurrency === 'YER'
        ? 'ريال يمني'
        : selectedCurrency === 'SAR'
          ? 'ريال سعودي'
          : selectedCurrency;
    try {
      return tafqeet(enteredAmount, label);
    } catch {
      return '';
    }
  }, [enteredAmount, selectedCurrency]);

  useEffect(() => {
    if (isOpen) {
      idempotencyKeyRef.current = createIdempotencyKey('bond');
      const targetAccount = defaultAccountId
        ? allAccounts?.find(a => a.id === defaultAccountId)
        : undefined;
      const initialCurrency = targetAccount?.currency_code || 'SAR';

      reset({
        type,
        date: formatLocalDate(),
        currency_code: initialCurrency,
        exchange_rate: 1,
        counterparty_type: type === 'transfer' ? 'account' : 'party',
        payment_method: 'cash',
        cash_account_id: defaultAccountId || '',
      });
      setPartyQuery('');
      setShowPartyDropdown(false);
      setAmountInputStr('');
      setRateInputStr('1');
      setEquivalentSarInputStr('');
      setCommissionInputStr('');
    }
  }, [isOpen, type, reset, defaultAccountId, allAccounts]);

  // Currency switch and default rate loader
  useEffect(() => {
    if (selectedCurrency === 'SAR') {
      setValue('exchange_rate', 1);
      setValue('foreign_amount', 0);
      setRateInputStr('1');
      setEquivalentSarInputStr('');
    } else {
      const rate = rates.data?.find(
        (r: { currency_code: string; rate_to_base: number }) => r.currency_code === selectedCurrency
      );
      // For YER, if no rate or 1 is set, default to 410 (standard Yemeni Rial market divider)
      const defaultRate =
        rate?.rate_to_base && rate.rate_to_base !== 1
          ? rate.rate_to_base
          : selectedCurrency === 'YER'
            ? 410
            : 1;

      setValue('exchange_rate', defaultRate);
      setRateInputStr(String(defaultRate));
    }
  }, [selectedCurrency, rates.data, setValue]);

  const foreignAmount = watch('foreign_amount');
  const exchangeRate = watch('exchange_rate');

  // Sync equivalent base amount (SAR)
  useEffect(() => {
    if (selectedCurrency !== 'SAR' && foreignAmount && exchangeRate) {
      try {
        const baseAmount = convertToBaseCurrency({
          amount: foreignAmount,
          currencyCode: selectedCurrency,
          exchangeRate: exchangeRate,
          exchangeOperator:
            (currencyObj?.exchange_operator as 'multiply' | 'divide') ||
            (selectedCurrency === 'YER' ? 'divide' : 'multiply'),
        });
        setValue('amount', baseAmount);
        setEquivalentSarInputStr(String(baseAmount));
      } catch (e) {
        logger.error('useBondForm', 'Conversion failed', e);
      }
    } else if (selectedCurrency === 'SAR') {
      const sarAmount = watch('amount') || 0;
      setEquivalentSarInputStr(sarAmount > 0 ? String(sarAmount) : '');
    }
  }, [selectedCurrency, foreignAmount, exchangeRate, currencyObj, setValue, watch]);

  const { cashAccounts, otherAccounts } = useMemo(() => {
    const cash = allAccounts?.filter(acc => acc.code.startsWith('10')) || [];
    const others = allAccounts?.filter(acc => !acc.code.startsWith('10')) || [];
    return { cashAccounts: cash, otherAccounts: others };
  }, [allAccounts]);

  // Auto-select primary cash account if none selected
  useEffect(() => {
    if (cashAccounts.length > 0 && !watch('cash_account_id')) {
      const primaryCash = cashAccounts.find(a => a.code === '1010') || cashAccounts[0];
      if (primaryCash) {
        setValue('cash_account_id', primaryCash.id);
      }
    }
  }, [cashAccounts, setValue, watch]);

  const handlePartySelect = (party: any) => {
    setValue('counterparty_id', party.id);
    setValue('invoice_id', undefined);
    setPartyQuery(party.name);
    setShowPartyDropdown(false);
  };

  const handleInvoiceSelect = (inv: any) => {
    if (!inv) {
      setValue('invoice_id', undefined);
      return;
    }
    setValue('invoice_id', inv.id);
    const remaining = Number(inv.total_amount) - Number(inv.paid_amount || 0);
    const invCurrency = inv.currency_code || inv.currency || 'SAR';
    const invRate = Number(inv.exchange_rate) || (invCurrency === 'YER' ? 410 : 1);

    setValue('currency_code', invCurrency);
    setValue('exchange_rate', invRate);
    setRateInputStr(String(invRate));

    if (invCurrency !== 'SAR') {
      setValue('foreign_amount', remaining);
      setAmountInputStr(String(remaining));
      const baseAmount = convertToBaseCurrency({
        amount: remaining,
        currencyCode: invCurrency,
        exchangeRate: invRate,
        exchangeOperator:
          (currencyObj?.exchange_operator as 'multiply' | 'divide') ||
          (invCurrency === 'YER' ? 'divide' : 'multiply'),
      });
      setValue('amount', baseAmount);
      setEquivalentSarInputStr(String(baseAmount));
    } else {
      setValue('amount', remaining);
      setValue('foreign_amount', 0);
      setAmountInputStr(String(remaining));
      setEquivalentSarInputStr(String(remaining));
    }

    setValue(
      'description',
      `سداد فاتورة ${type === 'receipt' ? 'مبيعات' : 'مشتريات'} رقم ${inv.invoice_number}`
    );
  };

  // Strict digit normalizer onChange handlers
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeNumericInput(e.target.value);
    setAmountInputStr(sanitized);
    const numVal = sanitized === '' ? 0 : parseFloat(sanitized);
    const cleanNum = isNaN(numVal) ? 0 : numVal;
    if (selectedCurrency === 'SAR') {
      setValue('amount', cleanNum);
    } else {
      setValue('foreign_amount', cleanNum);
    }
  };

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeNumericInput(e.target.value);
    setRateInputStr(sanitized);
    const numVal = sanitized === '' ? 1 : parseFloat(sanitized);
    const cleanNum = isNaN(numVal) || numVal <= 0 ? 1 : numVal;
    setValue('exchange_rate', cleanNum);
  };

  const handleEquivalentSarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeNumericInput(e.target.value);
    setEquivalentSarInputStr(sanitized);
  };

  // Smart Bi-directional Auto Calculation of Exchange Rate
  const handleCalculateRateFromEquivalent = () => {
    const sarVal = parseFloat(equivalentSarInputStr);
    const foreignVal = parseFloat(amountInputStr);
    if (isNaN(sarVal) || sarVal <= 0 || isNaN(foreignVal) || foreignVal <= 0) {
      showToast('يجب إدخال المبلغ والمقابل بالريال السعودي لحساب سعر الصرف تلقائياً', 'warning');
      return;
    }
    const currentIsDivide =
      currencyObj?.exchange_operator === 'divide' || selectedCurrency === 'YER';
    let calculatedRate = 1;
    if (currentIsDivide) {
      // SAR = YER / Rate => Rate = YER / SAR
      calculatedRate = Math.round((foreignVal / sarVal) * 10000) / 10000;
    } else {
      // SAR = USD * Rate => Rate = SAR / USD
      calculatedRate = Math.round((sarVal / foreignVal) * 10000) / 10000;
    }
    setValue('exchange_rate', calculatedRate);
    setRateInputStr(String(calculatedRate));
    setValue('amount', sarVal);
    showToast(`تم حساب وتثبيت سعر الصرف تلقائياً: ${calculatedRate}`, 'success');
  };

  const handleCurrencyQuickSwitch = (newCurrency: string) => {
    setValue('currency_code', newCurrency);
    if (newCurrency === 'SAR') {
      setValue('exchange_rate', 1);
      setRateInputStr('1');
      const curAmount = parseFloat(amountInputStr) || 0;
      setValue('amount', curAmount);
      setValue('foreign_amount', 0);
    } else {
      const rate = rates.data?.find(
        (r: { currency_code: string; rate_to_base: number }) => r.currency_code === newCurrency
      );
      const defaultRate =
        rate?.rate_to_base && rate.rate_to_base !== 1
          ? rate.rate_to_base
          : newCurrency === 'YER'
            ? 410
            : 1;
      setValue('exchange_rate', defaultRate);
      setRateInputStr(String(defaultRate));
      const curAmount = parseFloat(amountInputStr) || 0;
      setValue('foreign_amount', curAmount);
    }
  };

  const handleQuickAmount = (delta: number) => {
    const current = Number(watch(selectedCurrency === 'SAR' ? 'amount' : 'foreign_amount') || 0);
    const updated = Math.max(0, current + delta);
    if (selectedCurrency === 'SAR') {
      setValue('amount', updated);
    } else {
      setValue('foreign_amount', updated);
    }
    setAmountInputStr(String(updated));
  };

  const handleClearAmount = () => {
    if (selectedCurrency === 'SAR') {
      setValue('amount', 0);
    } else {
      setValue('foreign_amount', 0);
    }
    setAmountInputStr('');
    setEquivalentSarInputStr('');
  };

  const handleCommissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeNumericInput(e.target.value);
    setCommissionInputStr(sanitized);
    const numVal = sanitized === '' ? 0 : parseFloat(sanitized);
    setValue('commission_amount', isNaN(numVal) ? 0 : numVal);
  };

  const onValidSubmit = useCallback(
    (data: BondFormData) => {
      // 1. Sanitize reference number
      if (data.reference_number) {
        data.reference_number = ensureLatinDigits(data.reference_number);
      }

      // 2. Validate transfer accounts
      if (
        type === 'transfer' &&
        data.cash_account_id &&
        data.counterparty_id &&
        data.cash_account_id === data.counterparty_id
      ) {
        showToast(
          'لا يمكن إجراء تحويل داخلي إلى نفس الحساب (حساب المصدر وحساب الهدف متطابقان)',
          'error'
        );
        return;
      }

      // 3. Validate positive amount
      const mainAmount =
        data.currency_code === 'SAR' ? data.amount : data.foreign_amount || data.amount;
      if (!mainAmount || mainAmount <= 0) {
        showToast('يجب إدخال مبلغ صحيح أكبر من الصفر', 'error');
        return;
      }

      // 4. Validate exchange rate for foreign currency
      if (data.currency_code !== 'SAR' && (!data.exchange_rate || data.exchange_rate <= 0)) {
        showToast('يجب تحديد سعر صرف صالح أكبر من الصفر', 'error');
        return;
      }

      // 5. Validate commission account if commission amount is entered
      if (data.commission_amount && data.commission_amount > 0 && !data.commission_account_id) {
        showToast('يجب تحديد الحساب المحاسبي لتوجيه مبلغ العمولة / الخصم', 'error');
        return;
      }

      onSubmit({ ...data, idempotency_key: idempotencyKeyRef.current });
    },
    [type, showToast, onSubmit]
  );

  // Derived Account Names for Live Journal Preview
  const selectedCashAccount = useMemo(() => {
    return cashAccounts.find(a => a.id === cashAccountId);
  }, [cashAccounts, cashAccountId]);

  const selectedCounterpartyAccount = useMemo(() => {
    if (counterpartyType === 'account') {
      return (type === 'transfer' ? cashAccounts : otherAccounts).find(
        a => a.id === counterpartyId
      );
    }
    return null;
  }, [counterpartyType, counterpartyId, type, cashAccounts, otherAccounts]);

  const selectedParty = useMemo(() => {
    if (counterpartyType === 'party') {
      return parties.find(p => p.id === counterpartyId);
    }
    return null;
  }, [counterpartyType, counterpartyId, parties]);

  const selectedCommissionAccount = useMemo(() => {
    return otherAccounts.find(a => a.id === commissionAccountId);
  }, [otherAccounts, commissionAccountId]);

  const theme =
    type === 'receipt'
      ? {
          color: 'emerald',
          icon: ArrowDown,
          title: 'سند قبض جديد',
          description: 'تسجيل عملية قبض نقدية أو بنكية في وضع ملء الشاشة للكمبيوتر',
        }
      : type === 'transfer'
        ? {
            color: 'blue',
            icon: ArrowRightLeft,
            title: 'تحويل داخلي جديد',
            description: 'تحويل مبالغ بين الخزائن والحسابات البنكية في وضع ملء الشاشة للكمبيوتر',
          }
        : {
            color: 'rose',
            icon: ArrowUpCircle,
            title: 'سند صرف جديد',
            description: 'تسجيل عملية صرف نقدية أو بنكية في وضع ملء الشاشة للكمبيوتر',
          };

  return {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    currencies,
    rates,
    parties,
    partyQuery,
    setPartyQuery,
    showPartyDropdown,
    setShowPartyDropdown,
    selectedCurrency,
    counterpartyType,
    counterpartyId,
    selectedInvoiceId,
    cashAccountId,
    enteredAmount,
    commissionAmount,
    currencyObj,
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
  };
}
