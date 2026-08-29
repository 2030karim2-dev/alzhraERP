import React, { useState } from 'react';
import { Search, User, X, Calendar, Hash, CreditCard, Warehouse, Wallet, Coins } from 'lucide-react';
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
    return typeof row.id === 'string' && typeof row.name_ar === 'string' && typeof row.currency_code === 'string';
};

const isWarehouse = (value: unknown): value is WarehouseType => {
    if (typeof value !== 'object' || value === null) return false;
    const row = value as Record<string, unknown>;
    return typeof row.id === 'string' && typeof row.name_ar === 'string';
};

const findMatchingAccount = (accounts: PaymentAccount[], currency: string): PaymentAccount | undefined => {
    const terms = currency === 'SAR' ? ['SAR', 'سعودي', 'ريال سعودي'] : ['YER', 'يمني', 'ريال يمني'];
    return accounts.find(account => account.currency_code === currency || terms.some(term => account.name_ar.toLowerCase().includes(term.toLowerCase())));
};

interface ExchangeRateRow { currency_code: string; rate_to_base: number; }
const resolveExchangeRate = (currency: string, currentRate: number, rates: readonly ExchangeRateRow[]): number => currency === 'SAR' ? 1 : rates.find(rate => rate.currency_code === currency)?.rate_to_base ?? currentRate;

interface MetaBlockProps { label: string; value: string; icon: React.ElementType; isSelect?: boolean; options?: Array<{ id: string; label: string }>; field: string; colorClass?: string; type?: 'text' | 'date' | 'input'; onChange: (field: string, value: string) => void; }
const MetaBlock: React.FC<MetaBlockProps> = ({ label, value, icon: Icon, isSelect, options, field, colorClass, type = 'text', onChange }) => <div className="relative flex-1 bg-[var(--app-surface)] border border-blue-100 dark:border-slate-800 p-2 max-md:p-0.5 flex flex-col group hover:bg-blue-50/40 transition-colors"><div className="flex items-center gap-1 max-md:gap-0.5 mb-1 max-md:mb-0"><Icon size={10} className={colorClass ?? 'text-blue-500'} /><span className="text-[10px] font-bold text-blue-400 dark:text-blue-600 uppercase tracking-widest leading-none">{label}</span></div>{isSelect === true ? <MetaSelect value={value} onChange={selected => { onChange(field, selected); }} options={options ?? []} placeholder={field === 'cashboxId' ? 'اختر الصندوق...' : field === 'warehouseId' ? 'اختر المستودع...' : 'اختر...'} /> : type === 'date' || type === 'input' ? <input type={type} value={value} onChange={event => { onChange(field, event.target.value); }} className="bg-transparent text-[11px] max-md:text-[10px] font-bold outline-none text-blue-900 dark:text-white text-right font-mono leading-none min-h-3" /> : <span className="text-[11px] max-md:text-[10px] font-bold text-blue-900 dark:text-gray-100 font-mono leading-none">{value}</span>}</div>;

interface SupplierHeaderProps { supplier: SupplierRef | null; query: string; isOpen: boolean; suppliers: Party[]; setSupplier: (supplier: SupplierRef | null) => void; setQuery: (query: string) => void; setIsOpen: (open: boolean) => void; }
const SupplierHeader: React.FC<SupplierHeaderProps> = ({ supplier, query, isOpen, suppliers, setSupplier, setQuery, setIsOpen }) => <div className="relative border-b-2 border-blue-100 dark:border-slate-800">{supplier ? <div className="bg-blue-700 px-3 max-md:px-1.5 py-1.5 max-md:py-0.5 flex items-center justify-between text-white"><div className="flex items-center gap-2"><User size={12} className="text-blue-200" /><span className="text-[11px] max-md:text-[10px] font-bold uppercase">المورد: {supplier.name}</span></div><button type="button" onClick={() => { setSupplier(null); }} className="p-1 hover:bg-white/10 rounded"><X size={14} /></button></div> : <div className="relative"><label htmlFor="purchase-supplier-search" className="sr-only">بحث عن المورد</label><input id="purchase-supplier-search" type="text" value={query} onChange={event => { setQuery(event.target.value); setIsOpen(true); }} placeholder="ابحث عن المورد (Search Supplier)..." className="w-full px-10 max-md:px-6 py-2.5 max-md:py-0.5 bg-white dark:bg-slate-800 text-[10px] max-md:text-[10px] font-bold outline-none text-blue-600 placeholder:text-blue-200" /><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300" size={14} />{isOpen && query.length > 1 && <div className="absolute z-50 w-full top-full bg-[var(--app-surface)] border-2 border-blue-600 shadow-2xl">{suppliers.map(item => <button type="button" key={item.id} onClick={() => { setSupplier(item); setIsOpen(false); }} className="w-full p-3 max-md:p-1.5 hover:bg-blue-600 hover:text-white cursor-pointer text-[11px] max-md:text-[10px] font-bold border-b dark:border-slate-800 text-right">{item.name}</button>)}</div>}</div>}</div>;

interface ExchangeRateBlockProps { exchangeRate: number; isDivide: boolean; onChange: (value: number) => void; }
const ExchangeRateBlock: React.FC<ExchangeRateBlockProps> = ({ exchangeRate, isDivide, onChange }) => <div className="bg-[var(--app-surface)] border border-blue-100 dark:border-slate-800 p-2 max-md:p-0.5 flex flex-col group hover:bg-blue-50/40 transition-colors"><div className="flex items-center gap-1 max-md:gap-0.5 mb-1 max-md:mb-0"><Coins size={10} className="text-amber-500" /><span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">سعر الصرف {isDivide ? '(÷)' : '(×)'}</span></div><input type="number" step="0.00001" value={exchangeRate ? (isDivide ? parseFloat((1 / exchangeRate).toFixed(5)) : exchangeRate) : ''} onChange={event => { const value = parseFloat(event.target.value); if (value) onChange(isDivide ? 1 / value : value); }} className="bg-transparent text-[11px] max-md:text-[10px] font-bold outline-none text-amber-600 dark:text-amber-400 text-right font-mono leading-none" /></div>;

interface MetadataGridProps { issueDate: string; invoiceNumber: string; invoiceType: string; cashboxId: string; warehouseId: string; currency: string; exchangeRate: number; isDivide: boolean; notes: string; paymentAccounts: PaymentAccount[]; warehouses: WarehouseType[]; currencies: Array<{ code: string }>; onChange: (field: string, value: string) => void; onRateChange: (value: number) => void; }
const MetadataGrid: React.FC<MetadataGridProps> = ({ issueDate, invoiceNumber, invoiceType, cashboxId, warehouseId, currency, exchangeRate, isDivide, notes, paymentAccounts, warehouses, currencies, onChange, onRateChange }) => <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 -space-x-px max-md:auto-rows-min"><MetaBlock label="تاريخ الفاتورة" field="issueDate" value={issueDate} icon={Calendar} type="date" colorClass="text-emerald-500" onChange={onChange} /><MetaBlock label="رقم فاتورة المورد" field="invoiceNumber" value={invoiceNumber} icon={Hash} type="input" colorClass="text-blue-600" onChange={onChange} /><MetaBlock label="نوع الفاتورة" field="invoiceType" value={invoiceType} icon={CreditCard} isSelect options={[{ id: 'cash', label: 'نقدي (Cash)' }, { id: 'credit', label: 'آجل (Credit)' }]} onChange={onChange} /><MetaBlock label="الصندوق / البنك" field="cashboxId" value={cashboxId} icon={Wallet} isSelect options={paymentAccounts.map(account => ({ id: account.id, label: account.name_ar }))} onChange={onChange} /><MetaBlock label="المستودع المستلم" field="warehouseId" value={warehouseId} icon={Warehouse} isSelect options={warehouses.map(warehouse => ({ id: warehouse.id, label: warehouse.name_ar }))} onChange={onChange} /><MetaBlock label="العملة" field="currency" value={currency} icon={Coins} isSelect options={currencies.length > 0 ? currencies.map(item => ({ id: item.code, label: item.code })) : [{ id: 'SAR', label: 'SAR' }]} onChange={onChange} />{currency !== 'SAR' ? <ExchangeRateBlock exchangeRate={exchangeRate} isDivide={isDivide} onChange={onRateChange} /> : <div className="bg-gray-50/20 dark:bg-slate-900/20 border border-blue-100 dark:border-slate-800 p-2 max-md:p-1 invisible lg:visible" />}{/* Placeholder preserves the desktop grid shape. */}<div className="bg-gray-50/50 dark:bg-slate-900/50 border border-blue-100 dark:border-slate-800 p-2 max-md:p-0.5 col-span-2 md:col-span-1 lg:col-span-1"><label htmlFor="purchase-supply-notes" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ملاحظات التوريد</label><input id="purchase-supply-notes" className="w-full bg-transparent outline-none text-[10px] max-md:text-[10px] font-bold mt-1 max-md:mt-0" placeholder="ملاحظات..." value={notes} onChange={event => { onChange('notes', event.target.value); }} /></div></div>;

const PurchaseMeta: React.FC = () => {
    const { supplier, setSupplier, invoiceNumber, issueDate, currency, exchangeRate, warehouseId, invoiceType, cashboxId, notes, setMetadata } = usePurchaseStore();
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
        if (currencyChanged || ratesJustLoaded) setMetadata('exchangeRate', resolveExchangeRate(currency, exchangeRate, rateRows));
        if (rateRows.length > 0) ratesLoaded.current = true;
        if (currencyChanged) {
            const matchingAccount = findMatchingAccount(paymentAccounts, currency);
            if (matchingAccount !== undefined) setMetadata('cashboxId', matchingAccount.id);
        }
        prevCurrency.current = currency;
    }, [currency, paymentAccounts, rates.data, exchangeRate, setMetadata]);

    const currencyObj = currencyRows.find(item => item.code === currency);
    return <div className="bg-blue-50/20 dark:bg-slate-950/20 border-b dark:border-slate-800 flex flex-col"><SupplierHeader supplier={supplier} query={query} isOpen={isOpen} suppliers={suppliers} setSupplier={setSupplier} setQuery={setQuery} setIsOpen={setIsOpen} /><MetadataGrid issueDate={issueDate} invoiceNumber={invoiceNumber} invoiceType={invoiceType} cashboxId={cashboxId} warehouseId={warehouseId} currency={currency} exchangeRate={exchangeRate} isDivide={currencyObj?.exchange_operator === 'divide'} notes={notes} paymentAccounts={paymentAccounts} warehouses={warehouseRows} currencies={currencyRows} onChange={setMetadata} onRateChange={value => { setMetadata('exchangeRate', value); }} /></div>;
};

export default PurchaseMeta;
