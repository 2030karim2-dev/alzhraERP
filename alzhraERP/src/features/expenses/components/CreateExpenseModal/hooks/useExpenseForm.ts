import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { ExpenseFormData } from '../../../types';
import { useExpenseCategories, useExpenseCategoryMutation, useNextExpenseNumber } from '../../../hooks';
import { useCurrencies } from '../../../../settings/hooks';

export const useExpenseForm = (isOpen: boolean) => {
    const { data: categories } = useExpenseCategories();
    const { data: nextVoucher } = useNextExpenseNumber();
    const { currencies, rates } = useCurrencies();
    const { mutate: addCategory, isPending: isAddingCategory } = useExpenseCategoryMutation();

    const [newCatMode, setNewCatMode] = useState(false);
    const [newCatName, setNewCatName] = useState('');

    const form = useForm<ExpenseFormData>({
        defaultValues: {
            expense_date: new Date().toISOString().split('T')[0],
            status: 'posted',
            currency_code: 'SAR',
            exchange_rate: 1,
            payment_method: 'cash',
            is_recurring: false
        }
    });

    const { watch, setValue } = form;
    const selectedCurrency = watch('currency_code');

    // Auto-fill voucher number when modal opens
    useEffect(() => {
        if (isOpen && nextVoucher) {
            setValue('voucher_number', nextVoucher);
        }
    }, [isOpen, nextVoucher, setValue]);

    useEffect(() => {
        if (selectedCurrency === 'SAR') {
            setValue('exchange_rate', 1);
        } else {
            const rate = rates.data?.find((r: any) => r.currency_code === selectedCurrency);
            if (rate) setValue('exchange_rate', rate.rate_to_base);
        }
    }, [selectedCurrency, rates.data, setValue]);

    const handleAddCategory = () => {
        if (!newCatName.trim()) return;
        addCategory(newCatName, {
            onSuccess: () => {
                setNewCatMode(false);
                setNewCatName('');
            }
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
        isAddingCategory
    };
};
