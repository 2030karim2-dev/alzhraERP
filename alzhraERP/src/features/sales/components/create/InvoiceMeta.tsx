import React from 'react';
import {
  Calendar,
  Hash,
  CreditCard,
  Banknote,
  Warehouse,
  Wallet,
  Coins,
  ArrowRightLeft,
  User,
} from 'lucide-react';
import { useSalesStore } from '../../store';
import { usePaymentAccounts } from '../../../accounting/hooks/index';
import { useWarehouses } from '../../../inventory/hooks/useInventoryManagement';
import { useCurrencies } from '../../../settings/hooks';
import CustomerSelector from './CustomerSelector';
import { cn } from '../../../../core/utils';

interface Props {
  invoiceNumber?: string;
}

const InvoiceMeta: React.FC<Props> = ({ invoiceNumber }) => {
  const {
    invoiceType,
    currency,
    exchangeRate,
    exchangeOperator,
    warehouseId,
    cashboxId,
    setMetadata,
  } = useSalesStore();

  const { data: paymentAccounts } = usePaymentAccounts();
  const { data: warehouses } = useWarehouses();
  const { currencies, rates } = useCurrencies();
  const prevCurrency = React.useRef(currency);
  const ratesLoaded = React.useRef(false);

  React.useEffect(() => {
    const currencyChanged = prevCurrency.current !== currency;
    const ratesJustLoaded = !ratesLoaded.current && Boolean(rates.data);

    if ((currencyChanged || ratesJustLoaded) && rates.data) {
      if (currency === 'SAR') {
        setMetadata('exchangeRate', 1);
        setMetadata('exchangeOperator', 'multiply');
      } else {
        const rateObj = (rates.data as { currency_code: string; rate_to_base: number }[])?.find(
          r => r.currency_code === currency
        );
        if (rateObj) {
          setMetadata('exchangeRate', rateObj.rate_to_base);
          const currencyConfig = (
            currencies.data as { code: string; exchange_operator: string }[]
          )?.find(c => c.code === currency);
          if (currencyConfig) {
            setMetadata('exchangeOperator', currencyConfig.exchange_operator);
          }
        }
      }
    }

    if (rates.data) {
      ratesLoaded.current = true;
    }

    // 2. Handle Auto-Treasury (Cashbox) Selection (Only on currency change)
    if (currencyChanged && paymentAccounts && paymentAccounts.length > 0) {
      const searchTerms =
        currency === 'SAR' ? ['SAR', 'سعودي', 'ريال سعودي'] : ['YER', 'يمني', 'ريال يمني'];
      const matchingAccount = paymentAccounts.find(
        acc =>
          acc.currency_code === currency ||
          searchTerms.some(term => acc.name_ar.toLowerCase().includes(term.toLowerCase()))
      );

      if (matchingAccount) {
        setMetadata('cashboxId', matchingAccount.id);
      }
    }

    // Default primary warehouse selection
    if (warehouses && warehouses.length > 0 && (warehouseId === 'wh_main' || !warehouseId)) {
      const castWarehouses = warehouses as Record<string, unknown>[];
      const primary = castWarehouses.find(w => w.is_primary);
      const target = primary || castWarehouses[0];
      if (target?.id) {
        setMetadata('warehouseId', target.id as string);
      }
    }

    prevCurrency.current = currency;
  }, [
    currency,
    paymentAccounts,
    rates.data,
    warehouses,
    warehouseId,
    currencies.data,
    setMetadata,
  ]);

  const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  return (
    <div className="border-b border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="grid grid-cols-1 gap-3 text-xs lg:grid-cols-12">
        {/* 1. Customer Selection Card (Span 4 cols) */}
        <div className="dark:bg-slate-850 dark:border-slate-750 flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
              <User size={14} />
              <span className="text-[11px] font-black uppercase tracking-wider">بيانات العميل</span>
            </div>
            <span className="text-[10px] font-bold text-slate-400">اختيار أو بحث ذكي</span>
          </div>

          <div className="w-full">
            <CustomerSelector />
          </div>
        </div>

        {/* 2. Payment Terms & Invoice Meta Card (Span 4 cols) */}
        <div className="dark:bg-slate-850 dark:border-slate-750 flex flex-col justify-between gap-2.5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs lg:col-span-4">
          {/* Top row: Invoice # and Issue Date */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="mb-1 flex items-center gap-1 text-slate-400">
                <Hash size={12} className="text-blue-500" />
                <span className="text-[10px] font-bold">رقم الفاتورة</span>
              </div>
              <span className="font-mono text-xs font-black text-slate-800 dark:text-slate-200">
                #{invoiceNumber || '---'}
              </span>
            </div>

            <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="mb-1 flex items-center gap-1 text-slate-400">
                <Calendar size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold">تاريخ التحرير</span>
              </div>
              <span
                dir="ltr"
                className="block text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-200"
              >
                {date}
              </span>
            </div>
          </div>

          {/* Payment Method Toggle Pills */}
          <div>
            <div className="mb-1.5 flex items-center gap-1 text-slate-400">
              <CreditCard size={12} className="text-amber-500" />
              <span className="text-[10px] font-bold">طريقة السداد</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200/60 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setMetadata('invoiceType', 'cash')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-black transition-all',
                  invoiceType === 'cash'
                    ? 'border border-slate-200/60 bg-white text-emerald-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <Banknote size={14} />
                <span>نقداً (Cash)</span>
              </button>

              <button
                type="button"
                onClick={() => setMetadata('invoiceType', 'credit')}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-black transition-all',
                  invoiceType === 'credit'
                    ? 'border border-slate-200/60 bg-white text-blue-600 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                )}
              >
                <CreditCard size={14} />
                <span>آجل (Credit)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Currency, Cashbox & Warehouse Control (Span 4 cols) */}
        <div className="dark:bg-slate-850 dark:border-slate-750 flex flex-col justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs lg:col-span-4">
          {/* Row 1: Currency and FX */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 flex items-center gap-1 text-slate-400">
                <Coins size={12} className="text-amber-500" />
                <span className="text-[10px] font-bold">العملة</span>
              </div>
              <select
                value={currency || 'SAR'}
                onChange={e => setMetadata('currency', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {(currencies.data as { code: string }[])?.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                )) || <option value="SAR">SAR</option>}
              </select>
            </div>

            <div>
              <div className="mb-1 flex items-center gap-1 text-slate-400">
                <ArrowRightLeft size={12} className="text-indigo-500" />
                <span className="text-[10px] font-bold">
                  سعر الصرف {exchangeOperator === 'divide' ? '(÷)' : '(×)'}
                </span>
              </div>
              <input
                type="number"
                step="0.00001"
                disabled={currency === 'SAR'}
                value={
                  currency === 'SAR'
                    ? 1
                    : exchangeRate
                      ? exchangeOperator === 'divide'
                        ? parseFloat((1 / exchangeRate).toFixed(5))
                        : exchangeRate
                      : 1
                }
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (!val) return;
                  setMetadata('exchangeRate', exchangeOperator === 'divide' ? 1 / val : val);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-mono text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Row 2: Treasury Account & Warehouse */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 flex items-center gap-1 text-slate-400">
                <Wallet size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold">حساب الصندوق</span>
              </div>
              <select
                value={cashboxId || ''}
                onChange={e => setMetadata('cashboxId', e.target.value)}
                className="w-full truncate rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {paymentAccounts?.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name_ar}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-1 flex items-center gap-1 text-slate-400">
                <Warehouse size={12} className="text-purple-500" />
                <span className="text-[10px] font-bold">المستودع</span>
              </div>
              <select
                value={warehouseId || ''}
                onChange={e => setMetadata('warehouseId', e.target.value)}
                className="w-full truncate rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                {warehouses?.map((w: Record<string, unknown>) => (
                  <option key={w.id as string} value={w.id as string}>
                    {(w.name_ar as string) || (w.name as string)}
                  </option>
                )) || <option value="wh_main">المستودع الرئيسي</option>}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceMeta;
