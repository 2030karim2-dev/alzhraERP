import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { ExpenseFormData } from '../../../types';
import {
  useExpenseCategories,
  useExpenseCategoryMutation,
  useNextExpenseNumber,
} from '../../../hooks';
import { useCurrencies } from '../../../../settings/hooks';
import { formatLocalDate } from '../../../../../core/utils/dateUtils';
import { resolveAutoExchangeRate } from '../../../../../core/utils/currencyUtils';

export const useExpenseForm = (isOpen: boolean) => {
  const { data: categories } = useExpenseCategories();
  const { data: nextVoucher } = useNextExpenseNumber();
  const { currencies, rates } = useCurrencies();
  const { mutate: addCategory, isPending: isAddingCategory } = useExpenseCategoryMutation();

  const [newCatMode, setNewCatMode] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [isManualRate, setIsManualRate] = useState(false);

  const form = useForm<ExpenseFormData>({
    defaultValues: {
      expense_date: formatLocalDate(),
      status: 'posted',
      currency_code: 'SAR',
      exchange_rate: 1,
      payment_method: 'cash',
      is_recurring: false,
    },
  });

  const { watch, setValue } = form;
  const selectedCurrency = watch('currency_code');

  // Auto-fill voucher number when modal opens
  useEffect(() => {
    if (isOpen && nextVoucher) {
      setValue('voucher_number', nextVoucher);
    }
  }, [isOpen, nextVoucher, setValue]);

  // Automatically update exchange rate unless user has manually customized it
  useEffect(() => {
    if (!isManualRate) {
      const autoRate = resolveAutoExchangeRate(
        selectedCurrency,
        (rates.data as any) || [],
        (currencies.data as any) || []
      );
      setValue('exchange_rate', autoRate, { shouldValidate: true });
    }
  }, [selectedCurrency, rates.data, currencies.data, isManualRate, setValue]);

  // Reset to automatic rate when switching currency or when modal opens
  useEffect(() => {
    setIsManualRate(false);
  }, [selectedCurrency, isOpen]);

  const handleToggleManualRate = () => {
    setIsManualRate(prev => {
      const next = !prev;
      if (!next) {
        // Resetting back to auto
        const autoRate = resolveAutoExchangeRate(
          selectedCurrency,
          (rates.data as any) || [],
          (currencies.data as any) || []
        );
        setValue('exchange_rate', autoRate, { shouldValidate: true });
      }
      return next;
    });
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    addCategory(newCatName, {
      onSuccess: () => {
        setNewCatMode(false);
        setNewCatName('');
      },
    });
  };

  return {
    form,
    categories,
    currencies,
    newCatMode,
    setNewCatMode,
    newCatName,
    setNewCatName,
    handleAddCategory,
    isAddingCategory,
    isManualRate,
    handleToggleManualRate,
  };
};
