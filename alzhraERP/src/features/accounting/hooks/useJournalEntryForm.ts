import { useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { JournalEntryFormData } from '../types/index';
import { useAccounts } from './index';
import { useCurrencies } from '../../settings/hooks';

const journalLineSchema = z.object({
    account_id: z.string().min(1, 'يجب اختيار الحساب'),
    description: z.string(),
    debit_amount: z.number().min(0),
    credit_amount: z.number().min(0),
}).refine(data => (data.debit_amount > 0 && data.credit_amount === 0) || (data.credit_amount > 0 && data.debit_amount === 0), {
    message: 'يجب إدخال إما مبلغ مدين أو دائن فقط لكل سطر',
    path: ['debit_amount']
});

const journalEntrySchema = z.object({
    date: z.string().min(1, 'التاريخ مطلوب'),
    description: z.string().min(3, 'الوصف العام مطلوب (على الأقل 3 أحرف)'),
    currency_code: z.string().optional(),
    exchange_rate: z.number().optional(),
    lines: z.array(journalLineSchema).min(2, 'يجب أن يحتوي القيد على سطرين على الأقل')
}).refine(data => {
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debit_amount, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.credit_amount, 0);
    return Math.abs(totalDebit - totalCredit) < 0.01;
}, {
    message: 'القيد غير متوازن (إجمالي المدين لا يساوي إجمالي الدائن)',
    path: ['lines']
});

export const useJournalEntryForm = (onSubmit: (data: JournalEntryFormData) => void, isOpen: boolean) => {
    const { data: accounts, isLoading: isLoadingAccounts } = useAccounts();
    const { currencies, rates } = useCurrencies();

    const form = useForm<JournalEntryFormData>({
        resolver: zodResolver(journalEntrySchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            description: '',
            currency_code: 'SAR',
            exchange_rate: 1,
            lines: [
                { account_id: '', description: '', debit_amount: 0, credit_amount: 0 },
                { account_id: '', description: '', debit_amount: 0, credit_amount: 0 }
            ]
        }
    });

    const { control, register, handleSubmit, watch, reset, setValue, formState: { errors } } = form;

    const selectedCurrency = watch('currency_code');
    const exchangeRate = watch('exchange_rate') || 1;

    const currencyObj = currencies.data?.find((c: any) => c.code === selectedCurrency);
    const isDivide = currencyObj?.exchange_operator === 'divide';

    useEffect(() => {
        if (selectedCurrency === 'SAR') {
            setValue('exchange_rate', 1);
        } else {
            const rate = rates.data?.find((r: any) => r.currency_code === selectedCurrency);
            if (rate) setValue('exchange_rate', rate.rate_to_base);
        }
    }, [selectedCurrency, rates.data, setValue]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "lines"
    });

    const lines = watch("lines");

    const totals = useMemo(() => lines.reduce((acc: any, line: any) => ({
        debit_amount: acc.debit_amount + (Number(line.debit_amount) || 0),
        credit_amount: acc.credit_amount + (Number(line.credit_amount) || 0)
    }), { debit_amount: 0, credit_amount: 0 }), [lines]);

    const difference = totals.debit_amount - totals.credit_amount;
    const isBalanced = Math.abs(difference) < 0.01 && totals.debit_amount > 0;

    useEffect(() => {
        if (isOpen) {
            reset();
        }
    }, [isOpen, reset]);

    const handleFormSubmit = (data: JournalEntryFormData) => {
        onSubmit(data);
    };

    return {
        form,
        register,
        handleSubmit: handleSubmit(handleFormSubmit),
        errors,
        setValue,
        fields,
        append,
        remove,
        accounts,
        isLoadingAccounts,
        currencies,
        selectedCurrency,
        exchangeRate,
        isDivide,
        totals,
        difference,
        isBalanced
    };
};
