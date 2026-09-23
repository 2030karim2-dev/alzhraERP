import { useMemo } from 'react';
import type { Expense } from '../types';
import { toBaseCurrency } from '../../../core/utils/currencyUtils';
import { formatLocalDate } from '../../../core/utils/dateUtils';
import { logger } from '../../../core/utils/logger';

/** تحويل آمن للعملة إلى العملة الأساسية — يُعيد 0 عند وجود سعر صرف خاطئ */
const safeToBase = (expense: Expense): number => {
  try {
    return toBaseCurrency({
      amount: Number(expense.amount),
      currency_code: expense.currency_code,
      exchange_rate: expense.exchange_rate,
    });
  } catch (err) {
    logger.warn('useExpenseAnalytics', 'Invalid exchange rate — treated as 0', {
      id: expense.id,
      currency_code: expense.currency_code,
      exchange_rate: expense.exchange_rate,
      error: err,
    });
    return 0;
  }
};

export type ExpenseAnalyticsPeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';

export const useExpenseAnalytics = (
  expenses: Expense[] | undefined,
  period: ExpenseAnalyticsPeriod = 'month'
) => {
  return useMemo(() => {
    // استبعاد المصروفات الملغاة من جميع الإحصائيات
    const rawActive = (expenses || []).filter(e => e.status !== 'void');

    // تحديد المدى الزمني للفترة المختارة باستخدام formatLocalDate لتفادي انزياح التوقيت
    const todayStr = formatLocalDate();
    const [ty, tm, td] = todayStr.split('-').map(Number);

    let daysToInclude = 30;
    if (period === 'today') daysToInclude = 1;
    else if (period === 'week') daysToInclude = 7;
    else if (period === 'month') daysToInclude = 30;
    else if (period === 'quarter') daysToInclude = 90;
    else if (period === 'year') daysToInclude = 365;

    // حساب تاريخ البداية
    const startDateObj = new Date(ty, tm - 1, td - (daysToInclude - 1));
    const startStr = [
      startDateObj.getFullYear(),
      String(startDateObj.getMonth() + 1).padStart(2, '0'),
      String(startDateObj.getDate()).padStart(2, '0'),
    ].join('-');

    // تصفية المصروفات وفق الفترة المحددة
    const allExpenses = rawActive.filter(
      e => e.expense_date >= startStr && e.expense_date <= todayStr
    );

    const totalAmount = allExpenses.reduce((sum, e) => sum + safeToBase(e), 0);
    const count = allExpenses.length;
    const avgAmount = count > 0 ? totalAmount / count : 0;

    const byDate = allExpenses.reduce<
      Record<string, { date: string; amount: number; count: number }>
    >((acc, expense) => {
      const date = expense.expense_date;
      if (!acc[date]) acc[date] = { date, amount: 0, count: 0 };
      acc[date].amount += safeToBase(expense);
      acc[date].count += 1;
      return acc;
    }, {});

    // إنشاء نقاط الرسم البياني حسب الفترة
    const chartData = [];
    const chartSteps = period === 'today' ? 1 : daysToInclude > 90 ? 12 : daysToInclude;

    if (daysToInclude > 90) {
      // تجميع شهري عند اختيار السنة
      for (let m = 11; m >= 0; m--) {
        const d = new Date(ty, tm - 1 - m, 1);
        const monthPrefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        let monthAmount = 0;
        let monthCount = 0;
        for (const [dt, val] of Object.entries(byDate)) {
          if (dt.startsWith(monthPrefix)) {
            monthAmount += val.amount;
            monthCount += val.count;
          }
        }
        chartData.push({
          date: `${monthPrefix}-01`,
          amount: monthAmount,
          count: monthCount,
        });
      }
    } else {
      for (let i = chartSteps - 1; i >= 0; i--) {
        const d = new Date(ty, tm - 1, td - i);
        const dateStr = [
          d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, '0'),
          String(d.getDate()).padStart(2, '0'),
        ].join('-');
        chartData.push({
          date: dateStr,
          amount: byDate[dateStr]?.amount || 0,
          count: byDate[dateStr]?.count || 0,
        });
      }
    }

    const byCategory = allExpenses.reduce<
      Record<string, { name: string; amount: number; count: number }>
    >((acc, expense) => {
      const name = expense.category_name || 'غير مصنف';
      if (!acc[name]) acc[name] = { name, amount: 0, count: 0 };
      acc[name].amount += safeToBase(expense);
      acc[name].count += 1;
      return acc;
    }, {});

    const categoryData = Object.values(byCategory)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    const byPaymentMethod = allExpenses.reduce<
      Record<string, { name: string; amount: number; count: number }>
    >((acc, expense) => {
      const method = expense.payment_method;
      const methodName = method === 'cash' ? 'نقدي' : method === 'bank' ? 'بنكي' : 'آجل';
      if (!acc[method]) acc[method] = { name: methodName, amount: 0, count: 0 };
      acc[method].amount += safeToBase(expense);
      acc[method].count += 1;
      return acc;
    }, {});

    const paymentData = Object.values(byPaymentMethod);

    return {
      totalAmount,
      count,
      avgAmount,
      chartData,
      categoryData,
      paymentData,
    };
  }, [expenses, period]);
};
