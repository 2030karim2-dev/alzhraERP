import React, { useState } from 'react';
import {
  Search,
  User,
  X,
  Calendar,
  Hash,
  CreditCard,
  Warehouse,
  Wallet,
  Coins,
} from 'lucide-react';
import { useSupplierSearch } from '../../hooks';
import { usePurchaseStore, type SupplierRef } from '../../store';
import { usePaymentAccounts } from '../../../accounting/hooks/index';
import { useCurrencies } from '../../../settings/hooks';
import { useWarehouses } from '../../../inventory/hooks/useWarehouses';
import type { PaymentAccount } from '../../../accounting/hooks/usePaymentAccounts';
import type { Warehouse as WarehouseType } from '../../../inventory/types';
import type { Party } from '../../../parties/types';
import MetaSelect from './MetaSelect';

const isPaymentAccount = (value: unknown): value is PaymentAccount => {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === 'string' &&
    typeof row.name_ar === 'string' &&
    typeof row.currency_code === 'string'
  );
};

const isWarehouse = (value: unknown): value is WarehouseType => {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && typeof row.name_ar === 'string';
};

const findMatchingAccount = (
  accounts: PaymentAccount[],
  currency: string
): PaymentAccount | undefined => {
  const terms = currency === 'SAR' ? ['SAR', 'سعودي', 'ريال سعودي'] : ['YER', 'يمني', 'ريال يمني'];
  return accounts.find(
    account =>
      account.currency_code === currency ||
      terms.some(term => account.name_ar.toLowerCase().includes(term.toLowerCase()))
  );
};

interface ExchangeRateRow {
  currency_code: string;
  rate_to_base: number;
}
const resolveExchangeRate = (
  currency: string,
  currentRate: number,
  rates: readonly ExchangeRateRow[]
): number =>
  currency === 'SAR'
    ? 1
    : (rates.find(rate => rate.currency_code === currency)?.rate_to_base ?? currentRate);

interface MetaBlockProps {
  label: string;
  value: string;
  icon: React.ElementType;
  isSelect?: boolean;
  options?: Array<{ id: string; label: string }>;
  field: string;
  colorClass?: string;
  type?: 'text' | 'date' | 'input';
  onChange: (field: string, value: string) => void;
}

const MetaBlock: React.FC<MetaBlockProps> = ({
  label,
  value,
  icon: Icon,
  isSelect,
  options,
  field,
  colorClass,
  type = 'text',
  onChange,
}) => (
  <div className="relative flex min-w-0 flex-1 flex-col justify-center bg-[var(--app-surface)] p-1.5">
    <div className="mb-0.5 flex items-center gap-1">
      <Icon size={10} className={colorClass ?? 'text-blue-500'} />
      <span className="truncate text-[10px] font-bold uppercase leading-none tracking-wider text-slate-400 dark:text-slate-500">
        {label}
      </span>
    </div>
    {isSelect === true ? (
      <MetaSelect
        value={value}
        onChange={selected => {
          onChange(field, selected);
        }}
        options={options ?? []}
        placeholder={
          field === 'cashboxId' ? 'الصندوق...' : field === 'warehouseId' ? 'المستودع...' : 'اختر...'
        }
      />
    ) : type === 'date' || type === 'input' ? (
      <input
        type={type}
        value={value}
        onChange={event => {
          onChange(field, event.target.value);
        }}
        className="min-h-4 w-full bg-transparent font-mono text-[11px] font-bold leading-none text-blue-950 outline-none dark:text-white max-md:text-[10px]"
      />
    ) : (
      <span className="truncate font-mono text-[11px] font-bold leading-none text-blue-950 dark:text-gray-100 max-md:text-[10px]">
        {value}
      </span>
    )}
  </div>
);

interface SupplierHeaderProps {
  supplier: SupplierRef | null;
  query: string;
  isOpen: boolean;
  suppliers: Party[];
  setSupplier: (supplier: SupplierRef | null) => void;
  setQuery: (query: string) => void;
  setIsOpen: (open: boolean) => void;
}

const SupplierHeader: React.FC<SupplierHeaderProps> = ({
  supplier,
  query,
  isOpen,
  suppliers,
  setSupplier,
  setQuery,
  setIsOpen,
}) => (
  <div className="relative border-b border-blue-100/70 dark:border-slate-800">
    {supplier ? (
      <div className="flex items-center justify-between bg-blue-600 px-3 py-1.5 text-white max-md:px-2 max-md:py-1">
        <div className="flex min-w-0 items-center gap-2">
          <User size={13} className="shrink-0 text-blue-200" />
          <span className="truncate text-xs font-bold max-md:text-[11px]">
            المورد: {supplier.name}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setSupplier(null);
          }}
          className="rounded p-1 text-blue-100 transition-colors hover:bg-white/20 hover:text-white"
          title="تغيير المورد"
        >
          <X size={13} />
        </button>
      </div>
    ) : (
      <div className="relative">
        <label htmlFor="purchase-supplier-search" className="sr-only">
          بحث عن المورد
        </label>
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
        <input
          id="purchase-supplier-search"
          type="text"
          value={query}
          onChange={event => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          placeholder="ابحث عن المورد بالاسم أو الهاتف..."
          className="w-full bg-white py-2 pl-3 pr-9 text-xs font-bold text-blue-900 outline-none placeholder:font-normal placeholder:text-slate-400 dark:bg-slate-900 dark:text-white max-md:py-1.5 max-md:text-[11px]"
        />
        {isOpen && query.length > 1 && (
          <div className="absolute top-full z-50 max-h-56 w-full overflow-y-auto border-2 border-blue-600 bg-[var(--app-surface)] shadow-2xl">
            {suppliers.map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  setSupplier(item);
                  setIsOpen(false);
                }}
                className="w-full border-b px-3 py-2 text-right text-xs font-bold text-slate-800 transition-colors hover:bg-blue-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-blue-900/30"
              >
                {item.name}
              </button>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);

interface ExchangeRateBlockProps {
  exchangeRate: number;
  isDivide: boolean;
  onChange: (value: number) => void;
}

const ExchangeRateBlock: React.FC<ExchangeRateBlockProps> = ({
  exchangeRate,
  isDivide,
  onChange,
}) => (
  <div className="relative flex min-w-0 flex-1 flex-col justify-center bg-[var(--app-surface)] p-1.5">
    <div className="mb-0.5 flex items-center gap-1">
      <Coins size={10} className="text-amber-500" />
      <span className="truncate text-[10px] font-bold uppercase leading-none tracking-wider text-amber-500">
        الصرف {isDivide ? '(÷)' : '(×)'}
      </span>
    </div>
    <input
      type="number"
      step="0.00001"
      value={
        exchangeRate ? (isDivide ? parseFloat((1 / exchangeRate).toFixed(5)) : exchangeRate) : ''
      }
      onChange={event => {
        const value = parseFloat(event.target.value);
        if (value) onChange(isDivide ? 1 / value : value);
      }}
      className="min-h-4 w-full bg-transparent font-mono text-[11px] font-bold leading-none text-amber-600 outline-none dark:text-amber-400 max-md:text-[10px]"
    />
  </div>
);

interface MetadataGridProps {
  issueDate: string;
  invoiceNumber: string;
  invoiceType: string;
  cashboxId: string;
  warehouseId: string;
  currency: string;
  exchangeRate: number;
  isDivide: boolean;
  notes: string;
  paymentAccounts: PaymentAccount[];
  warehouses: WarehouseType[];
  currencies: Array<{ code: string }>;
  onChange: (field: string, value: string) => void;
  onRateChange: (value: number) => void;
}

const MetadataGrid: React.FC<MetadataGridProps> = ({
  issueDate,
  invoiceNumber,
  invoiceType,
  cashboxId,
  warehouseId,
  currency,
  exchangeRate,
  isDivide,
  notes,
  paymentAccounts,
  warehouses,
  currencies,
  onChange,
  onRateChange,
}) => (
  <div className="flex flex-col divide-y divide-blue-100/70 dark:divide-slate-800">
    {/* شريط 1: التاريخ + رقم الفاتورة + نوع الفاتورة (3 مربعات بشريط واحد) */}
    <div className="grid grid-cols-3 divide-x divide-x-reverse divide-blue-100/70 dark:divide-slate-800">
      <MetaBlock
        label="التاريخ"
        field="issueDate"
        value={issueDate}
        icon={Calendar}
        type="date"
        colorClass="text-emerald-500"
        onChange={onChange}
      />
      <MetaBlock
        label="رقم الفاتورة"
        field="invoiceNumber"
        value={invoiceNumber}
        icon={Hash}
        type="input"
        colorClass="text-blue-600"
        onChange={onChange}
      />
      <MetaBlock
        label="نوع الفاتورة"
        field="invoiceType"
        value={invoiceType}
        icon={CreditCard}
        isSelect
        options={[
          { id: 'cash', label: 'نقدي' },
          { id: 'credit', label: 'آجل' },
        ]}
        onChange={onChange}
      />
    </div>

    {/* شريط 2: المستودع + الصندوق/البنك + العملة وسعر الصرف (3 مربعات بشريط واحد) */}
    <div className="grid grid-cols-3 divide-x divide-x-reverse divide-blue-100/70 dark:divide-slate-800">
      <MetaBlock
        label="المستودع"
        field="warehouseId"
        value={warehouseId}
        icon={Warehouse}
        isSelect
        options={warehouses.map(warehouse => ({ id: warehouse.id, label: warehouse.name_ar }))}
        onChange={onChange}
      />
      <MetaBlock
        label="الصندوق / البنك"
        field="cashboxId"
        value={cashboxId}
        icon={Wallet}
        isSelect
        options={paymentAccounts.map(account => ({ id: account.id, label: account.name_ar }))}
        onChange={onChange}
      />
      {currency !== 'SAR' ? (
        <ExchangeRateBlock
          exchangeRate={exchangeRate}
          isDivide={isDivide}
          onChange={onRateChange}
        />
      ) : (
        <MetaBlock
          label="العملة"
          field="currency"
          value={currency}
          icon={Coins}
          isSelect
          options={
            currencies.length > 0
              ? currencies.map(item => ({ id: item.code, label: item.code }))
              : [{ id: 'SAR', label: 'SAR' }]
          }
          onChange={onChange}
        />
      )}
    </div>

    {/* شريط 3: ملاحظات التوريد بشكل شريط مدمج وأنيق */}
    <div className="bg-gray-50/50 px-2.5 py-1 dark:bg-slate-900/40">
      <div className="flex items-center gap-2">
        <label
          htmlFor="purchase-supply-notes"
          className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500"
        >
          الملاحظات:
        </label>
        <input
          id="purchase-supply-notes"
          className="w-full bg-transparent text-[11px] font-bold text-slate-800 outline-none placeholder:font-normal placeholder:text-slate-400 dark:text-slate-200 max-md:text-[10px]"
          placeholder="أدخل أي ملاحظات إضافية للتوريد..."
          value={notes}
          onChange={event => {
            onChange('notes', event.target.value);
          }}
        />
      </div>
    </div>
  </div>
);

const PurchaseMeta: React.FC = () => {
  const {
    supplier,
    setSupplier,
    invoiceNumber,
    issueDate,
    currency,
    exchangeRate,
    warehouseId,
    invoiceType,
    cashboxId,
    notes,
    setMetadata,
  } = usePurchaseStore();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { data: supplierRows } = useSupplierSearch(query);
  const suppliers = supplierRows ?? [];
  const { data: cashAccounts } = usePaymentAccounts();
  const paymentAccounts = cashAccounts.filter(isPaymentAccount);
  const { currencies, rates } = useCurrencies();
  const currencyRows = currencies.data ?? [];
  const { data: warehouses } = useWarehouses();
  const warehouseRows = (warehouses ?? []).filter(isWarehouse);
  const prevCurrency = React.useRef(currency);
  const ratesLoaded = React.useRef(false);

  React.useEffect(() => {
    const currencyChanged = prevCurrency.current !== currency;
    const rateRows = rates.data ?? [];
    const ratesJustLoaded = !ratesLoaded.current && rateRows.length > 0;
    if (currencyChanged || ratesJustLoaded)
      setMetadata('exchangeRate', resolveExchangeRate(currency, exchangeRate, rateRows));
    if (rateRows.length > 0) ratesLoaded.current = true;
    if (currencyChanged) {
      const matchingAccount = findMatchingAccount(paymentAccounts, currency);
      if (matchingAccount !== undefined) setMetadata('cashboxId', matchingAccount.id);
    }
    prevCurrency.current = currency;
  }, [currency, paymentAccounts, rates.data, exchangeRate, setMetadata]);

  const currencyObj = currencyRows.find(item => item.code === currency);
  return (
    <div className="flex flex-col border-b bg-blue-50/20 dark:border-slate-800 dark:bg-slate-950/20">
      <SupplierHeader
        supplier={supplier}
        query={query}
        isOpen={isOpen}
        suppliers={suppliers}
        setSupplier={setSupplier}
        setQuery={setQuery}
        setIsOpen={setIsOpen}
      />
      <MetadataGrid
        issueDate={issueDate}
        invoiceNumber={invoiceNumber}
        invoiceType={invoiceType}
        cashboxId={cashboxId}
        warehouseId={warehouseId}
        currency={currency}
        exchangeRate={exchangeRate}
        isDivide={currencyObj?.exchange_operator === 'divide'}
        notes={notes}
        paymentAccounts={paymentAccounts}
        warehouses={warehouseRows}
        currencies={currencyRows}
        onChange={setMetadata}
        onRateChange={value => {
          setMetadata('exchangeRate', value);
        }}
      />
    </div>
  );
};

export default PurchaseMeta;
