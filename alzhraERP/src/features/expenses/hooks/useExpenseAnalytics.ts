import { useMemo } from 'react';
import { Expense } from '../types';

export const useExpenseAnalytics = (expenses: Expense[] | undefined) => {
    return useMemo(() => {
        const allExpenses = expenses || [];
        const totalAmount = allExpenses.reduce((sum, e) => sum + e.amount, 0);
        const count = allExpenses.length;
        const avgAmount = count > 0 ? totalAmount / count : 0;

        const byDate = allExpenses.reduce((acc, expense) => {
            const date = expense.expense_date;
            if (!acc[date]) acc[date] = { date, amount: 0, count: 0 };
            acc[date].amount += expense.amount;
            acc[date].count += 1;
            return acc;
        }, {} as Record<string, { date: string; amount: number; count: number }>);

        // Fill gaps for the last 30 days
        const chartData = [];
        const now = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            chartData.push({
                date: dateStr,
                amount: byDate[dateStr]?.amount || 0,
                count: byDate[dateStr]?.count || 0
            });
        }

        const byCategory = allExpenses.reduce((acc, expense) => {
            const name = expense.category_name || 'غير مصنف';
            if (!acc[name]) acc[name] = { name, amount: 0, count: 0 };
            acc[name].amount += expense.amount;
            acc[name].count += 1;
            return acc;
        }, {} as Record<string, { name: string; amount: number; count: number }>);

        const categoryData = Object.values(byCategory)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6);

        const byPaymentMethod = allExpenses.reduce((acc, expense) => {
            const method = expense.payment_method;
            const methodName = method === 'cash' ? 'نقدي' : method === 'bank' ? 'بنكي' : 'آجل';
            if (!acc[method]) acc[method] = { name: methodName, amount: 0, count: 0 };
            acc[method].amount += expense.amount;
            acc[method].count += 1;
            return acc;
        }, {} as Record<string, { name: string; amount: number; count: number }>);

        const paymentData = Object.values(byPaymentMethod);

        return {
            totalAmount,
            count,
            avgAmount,
            chartData,
            categoryData,
            paymentData
        };
    }, [expenses]);
};
