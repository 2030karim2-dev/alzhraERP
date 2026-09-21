/* eslint-disable max-lines-per-function, @typescript-eslint/explicit-function-return-type, @typescript-eslint/restrict-template-expressions, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing */
import React from 'react';
import { Users, Crown, Shield } from 'lucide-react';
import { useI18nStore } from '@/lib/i18nStore';

interface TopCustomer {
  customerId: string;
  customerName: string;
  totalAmount: number;
  invoiceCount?: number;
}

interface TopCustomersListProps {
  topCustomers: TopCustomer[];
  isLoading: boolean;
  formatCurrency: (value: number) => string;
}

export const TopCustomersList: React.FC<TopCustomersListProps> = ({
  topCustomers,
  isLoading,
  formatCurrency,
}) => {
  const { dictionary: t } = useI18nStore();

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return {
          label: '#1',
          icon: Crown,
          tag: 'عميل رئيسي VIP',
          tagStyle: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
          style:
            'bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-900 shadow-sm shadow-amber-500/30',
        };
      case 1:
        return {
          label: '#2',
          tag: 'عميل مميز',
          tagStyle: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
          style: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-black',
        };
      case 2:
        return {
          label: '#3',
          tag: 'عميل نشط',
          tagStyle: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          style: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-black',
        };
      default:
        return {
          label: `#${index + 1}`,
          tag: 'نشط',
          tagStyle: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
          style: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold',
        };
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <Users size={16} />
          </div>
          <h4 className="text-base font-black tracking-tight text-slate-800 dark:text-white">
            {t.top_customers}
          </h4>
        </div>
        <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
          <Shield size={13} />
          <span>كبار الشركاء</span>
        </span>
      </div>
      <p className="mt-0.5 text-xs text-slate-400">
        تحليل الإنفاق ووتيرة تكرار الشراء لكبار العملاء
      </p>

      <div className="mt-4 space-y-2.5">
        {isLoading ? (
          <div className="space-y-2.5">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800/50"
              />
            ))}
          </div>
        ) : topCustomers.length > 0 ? (
          topCustomers.slice(0, 5).map((customer, index) => {
            const rank = getRankBadge(index);

            return (
              <div
                key={customer.customerId || `cust-${index}`}
                className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 p-3 transition-all duration-200 hover:border-slate-200 hover:bg-slate-50 dark:border-slate-800/60 dark:bg-slate-800/40 dark:hover:border-slate-700 dark:hover:bg-slate-800/70"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs ${rank.style}`}
                  >
                    {rank.icon ? <rank.icon size={13} /> : rank.label}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-black text-slate-800 dark:text-slate-200">
                        {customer.customerName}
                      </p>
                      <span
                        className={`py-0.2 rounded px-1.5 text-[10px] font-bold ${rank.tagStyle}`}
                      >
                        {rank.tag}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                      {customer.invoiceCount || 0} عملية شراء مسجلة
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono text-xs font-black text-slate-900 dark:text-white">
                    {formatCurrency(customer.totalAmount)}
                  </p>
                  <p className="mt-0.5 text-[10px] font-bold text-slate-400">إجمالي المشتريات</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-8 text-center">
            <Users size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-xs text-slate-400">{t.no_data_available || 'لا توجد بيانات'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopCustomersList;
