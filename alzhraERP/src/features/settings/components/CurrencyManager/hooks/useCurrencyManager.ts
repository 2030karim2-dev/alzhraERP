import { useState } from 'react';
import { useCurrencyMutation } from '../../../hooks';

export const useCurrencyManager = () => {
    const { setRate, addCurrency, deleteCurrency, refreshRates, isSaving } = useCurrencyMutation();

    const [activeRateEdit, setActiveRateEdit] = useState<string | null>(null);
    const [newRateValue, setNewRateValue] = useState<number>(0);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newCurrency, setNewCurrency] = useState<{ code: string, name_ar: string, symbol: string, exchange_operator: 'multiply' | 'divide' }>({ code: '', name_ar: '', symbol: '', exchange_operator: 'divide' });

    const handleUpdateRate = (code: string) => {
        setRate({
            currency_code: code,
            rate_to_base: newRateValue,
            effective_date: new Date().toISOString().split('T')[0]
        }, {
            onSuccess: () => setActiveRateEdit(null)
        });
    };

    const handleAddCurrency = () => {
        if (!newCurrency.code || !newCurrency.name_ar) return;
        addCurrency(newCurrency, {
            onSuccess: () => {
                setIsAddModalOpen(false);
                setNewCurrency({ code: '', name_ar: '', symbol: '', exchange_operator: 'divide' });
            }
        });
    };

    return {
        activeRateEdit, setActiveRateEdit,
        newRateValue, setNewRateValue,
        isAddModalOpen, setIsAddModalOpen,
        newCurrency, setNewCurrency,
        handleUpdateRate, handleAddCurrency,
        deleteCurrency, refreshRates, isSaving
    };
};
