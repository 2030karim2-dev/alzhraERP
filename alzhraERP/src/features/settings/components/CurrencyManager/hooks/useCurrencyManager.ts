import { useState } from 'react';
import { useCurrencyMutation } from '../../../hooks';
import { useFeedbackStore } from '../../../../feedback/store';

export const useCurrencyManager = () => {
  const { setRate, addCurrency, deleteCurrency, refreshRates, isSaving } = useCurrencyMutation();
  const { showToast } = useFeedbackStore();

  const [activeRateEdit, setActiveRateEdit] = useState<string | null>(null);
  const [newRateValue, setNewRateValue] = useState<number>(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCurrency, setNewCurrency] = useState<{
    code: string;
    name_ar: string;
    symbol: string;
    exchange_operator: 'multiply' | 'divide';
  }>({ code: '', name_ar: '', symbol: '', exchange_operator: 'divide' });

  const handleUpdateRate = (code: string) => {
    // A zero/negative/non-finite rate would corrupt every future conversion
    // for this currency — reject it before it reaches the database.
    if (!Number.isFinite(newRateValue) || newRateValue <= 0) {
      showToast('سعر الصرف يجب أن يكون رقماً موجباً أكبر من صفر', 'error');
      return;
    }
    setRate(
      {
        currency_code: code,
        rate_to_base: newRateValue,
        effective_date: new Date().toISOString().split('T')[0],
      },
      {
        onSuccess: () => {
          setActiveRateEdit(null);
        },
      }
    );
  };

  const handleAddCurrency = () => {
    if (!newCurrency.code || !newCurrency.name_ar) return;
    addCurrency(newCurrency, {
      onSuccess: () => {
        setIsAddModalOpen(false);
        setNewCurrency({ code: '', name_ar: '', symbol: '', exchange_operator: 'divide' });
      },
    });
  };

  return {
    activeRateEdit,
    setActiveRateEdit,
    newRateValue,
    setNewRateValue,
    isAddModalOpen,
    setIsAddModalOpen,
    newCurrency,
    setNewCurrency,
    handleUpdateRate,
    handleAddCurrency,
    deleteCurrency,
    refreshRates,
    isSaving,
  };
};
