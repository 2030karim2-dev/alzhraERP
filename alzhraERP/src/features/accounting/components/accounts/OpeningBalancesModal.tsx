
import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import {  Scale, Search } from 'lucide-react';
// Fix: Corrected import path to point to the barrel file.
import { useAccounts, useJournalMutation } from '../../hooks/index';
import { formatCurrency } from '../../../../core/utils';
import Modal from '../../../../ui/base/Modal';
import Button from '../../../../ui/base/Button';
import Spinner from '../../../../ui/base/Spinner';

interface OpeningBalancesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface OpeningBalanceLine {
    account_id: string;
    debit_amount: number;
    credit_amount: number;
};

type FormData = {
    lines: OpeningBalanceLine[];
    date: string;
};

const OpeningBalancesModal: React.FC<OpeningBalancesModalProps> = ({ isOpen, onClose }) => {
    const { data: accounts, isLoading } = useAccounts();
    const { createJournal, isCreating } = useJournalMutation();
    const [filter, setFilter] = useState('');

    const { control, register, handleSubmit, watch, setValue } = useForm<FormData>({
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            lines: []
        }
    });

    const { fields, replace } = useFieldArray({ control, name: "lines" });

    useEffect(() => {
        if (isOpen && accounts) {
            replace(accounts.map(acc => ({
                account_id: acc.id,
                debit_amount: 0,
                credit_amount: 0
            })));
        }
    }, [isOpen, accounts, replace]);

    const watchedLines = watch("lines");

    const totals = (watchedLines || []).reduce((acc, curr) => ({
        debit_amount: acc.debit_amount + (Number(curr.debit_amount) || 0),
        credit_amount: acc.credit_amount + (Number(curr.credit_amount) || 0)
    }), { debit_amount: 0, credit_amount: 0 });

    const difference = totals.debit_amount - totals.credit_amount;
    const isBalanced = Math.abs(difference) < 0.01;

    const onSubmit = (data: FormData) => {
        const filteredLines = data.lines.filter(line => Number(line.debit_amount) > 0 || Number(line.credit_amount) > 0).map(line => ({
            account_id: line.account_id,
            debit_amount: Number(line.debit_amount) || 0,
            credit_amount: Number(line.credit_amount) || 0,
            description: 'رصيد افتتاحي'
        }));

        if (filteredLines.length === 0 || !isBalanced) return;

        createJournal({
            date: data.date,
            description: 'القيد الافتتاحي للأرصدة (Micro-UI Sync)',
            reference_type: 'opening_balance',
            lines: filteredLines
        }, { onSuccess: onClose });
    };

    const filteredFields = fields.map((field, index) => ({ ...field, index })).filter(field =>
        (accounts?.find(acc => acc.id === field.account_id)?.name.toLowerCase().includes(filter.toLowerCase())) ||
        (accounts?.find(acc => acc.id === field.account_id)?.code.includes(filter))
    );

    const footer = (
        <div className="flex justify-between items-center w-full px-1">
            <div className="flex gap-3">
                <div className="flex flex-col text-right">
                    <span className="text-[7px] font-bold text-gray-400 uppercase">الفرق</span>
                    <span dir="ltr" className={`text-[11px] font-bold font-mono ${isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(Math.abs(difference))}
                    </span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[7px] font-bold text-gray-400 uppercase">إجمالي المدين</span>
                    <span dir="ltr" className="text-[11px] font-bold font-mono text-gray-800 dark:text-slate-100">
                        {formatCurrency(totals.debit_amount)}
                    </span>
                </div>
                <div className="flex flex-col text-right">
                    <span className="text-[7px] font-bold text-gray-400 uppercase">إجمالي الدائن</span>
                    <span dir="ltr" className="text-[11px] font-bold font-mono text-gray-800 dark:text-slate-100">
                        {formatCurrency(totals.credit_amount)}
                    </span>
                </div>
            </div>
            <div className="flex gap-1">
                <button onClick={onClose} className="px-4 py-2 text-[10px] font-bold text-gray-400 bg-white dark:bg-slate-800 border dark:border-slate-700 uppercase">إلغاء</button>
                <Button onClick={handleSubmit(onSubmit)} isLoading={isCreating} disabled={!isBalanced || isCreating} className="rounded-none text-[10px] font-bold bg-blue-600 border-blue-700 uppercase">
                    اعتماد الأرصدة
                </Button>
            </div>
        </div>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            icon={Scale}
            title="الأرصدة الافتتاحية"
            description="Micro-Grid Account Entry"
            footer={footer}
        >
            <div className="flex flex-col h-[500px]">
                <div className="flex items-center gap-2 p-2 border-b dark:border-slate-800 bg-gray-50 dark:bg-slate-900 sticky top-0 z-10">
                    <div className="relative flex-1">
                        <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                        <input
                            type="text"
                            placeholder="بحث سريع..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full pr-7 pl-2 py-1.5 bg-white dark:bg-slate-800 border dark:border-slate-700 text-[10px] font-bold outline-none"
                        />
                    </div>
                    <input
                        type="date"
                        {...register('date')}
                        className="w-28 py-1.5 px-2 bg-white dark:bg-slate-800 border dark:border-slate-700 text-[9px] font-bold outline-none"
                        dir="ltr"
                    />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {isLoading ? (
                        <div className="p-20 text-center"><Spinner /></div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead className="bg-gray-50 dark:bg-slate-800 text-[8px] font-bold text-gray-400 dark:text-slate-500 uppercase sticky top-0 z-10 border-b dark:border-slate-700">
                                <tr>
                                    <th className="p-2 text-right">الحساب</th>
                                    <th className="p-2 text-left w-20 bg-emerald-50/20">مدين</th>
                                    <th className="p-2 text-left w-20 bg-rose-50/20">دائن</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-slate-800">
                                {filteredFields.map((field) => {
                                    const account = accounts?.find(acc => acc.id === field.account_id);
                                    return (
                                        <tr key={field.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/5 transition-colors">
                                            <td className="p-2">
                                                <div className="text-[10px] font-bold text-gray-800 dark:text-slate-200">{account?.name}</div>
                                                <div className="text-[7px] font-mono text-gray-400">{account?.code}</div>
                                            </td>
                                            <td className="p-0 border-r dark:border-slate-800">
                                                <input
                                                    type="number" step="0.01"
                                                    {...register(`lines.${field.index}.debit_amount`, { valueAsNumber: true })}
                                                    className="w-full h-full p-2 bg-transparent text-[10px] font-bold font-mono text-emerald-600 outline-none focus:bg-emerald-50 dark:focus:bg-emerald-900/10"
                                                    dir="ltr"
                                                    onChange={(e) => { if (parseFloat(e.target.value) > 0) setValue(`lines.${field.index}.credit_amount`, 0); }}
                                                />
                                            </td>
                                            <td className="p-0">
                                                <input
                                                    type="number" step="0.01"
                                                    {...register(`lines.${field.index}.credit_amount`, { valueAsNumber: true })}
                                                    className="w-full h-full p-2 bg-transparent text-[10px] font-bold font-mono text-rose-600 outline-none focus:bg-rose-50 dark:focus:bg-rose-900/10"
                                                    dir="ltr"
                                                    onChange={(e) => { if (parseFloat(e.target.value) > 0) setValue(`lines.${field.index}.debit_amount`, 0); }}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default OpeningBalancesModal;