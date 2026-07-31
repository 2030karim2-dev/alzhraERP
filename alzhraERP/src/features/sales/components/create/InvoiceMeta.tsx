
import React from 'react';
// Force rebuild
import { Calendar, Hash, CreditCard, Warehouse, Wallet, Coins } from 'lucide-react';
import { useSalesStore } from '../../store';
import { usePaymentAccounts } from '../../../accounting/hooks/index';
import { useWarehouses } from '../../../inventory/hooks/useInventoryManagement';
import { useCurrencies } from '../../../settings/hooks';
import CustomerSelector from './CustomerSelector';

interface Props {
    invoiceNumber?: string;
}

interface MetaBlockProps {
    label: string;
    value: string | undefined;
    icon: React.ElementType;
    isSelect?: boolean;
    options?: { id: string; label: string }[];
    field?: string;
    colorClass?: string;
    onChange?: (field: string, value: string) => void;
}

const MetaBlock: React.FC<MetaBlockProps> = ({ label, value, icon: Icon, isSelect, options, field, colorClass, onChange }) => (
    <div className="flex-1 bg-white dark:bg-slate-900/50 border-r border-gray-100 dark:border-slate-800 p-2.5 flex flex-col group hover:bg-gray-50/40 transition-colors">
        <div className="flex items-center gap-1.5 mb-1.5">
            <Icon size={12} className={colorClass || "text-gray-400"} />
            <span className="text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
        </div>
        {isSelect && options && field && onChange ? (
            <select
                value={value}
                onChange={(e) => onChange(field, e.target.value)}
                className="bg-transparent text-[11px] font-bold outline-none cursor-pointer text-gray-800 dark:text-slate-100 text-right w-full py-0.5"
            >
                {options.map((opt) => (
                    <option
                        key={opt.id}
                        value={opt.id}
                        className="bg-white dark:bg-slate-900 text-gray-800 dark:text-slate-100"
                    >
                        {opt.label}
                    </option>
                ))}
            </select>
        ) : (
            <span className="text-sm font-bold text-gray-800 dark:text-slate-100 font-mono leading-none">
                {value}
            </span>
        )}
    </div>
);

const InvoiceMeta: React.FC<Props> = ({ invoiceNumber }) => {
    const {
        invoiceType, currency, exchangeRate, exchangeOperator, warehouseId, cashboxId,
        setMetadata
    } = useSalesStore();
    const { data: paymentAccounts } = usePaymentAccounts();
    const { data: warehouses } = useWarehouses();
    const { currencies, rates } = useCurrencies();
    const prevCurrency = React.useRef(currency);
    const ratesLoaded = React.useRef(false);

    React.useEffect(() => {
        const currencyChanged = prevCurrency.current !== currency;
        const ratesJustLoaded = !ratesLoaded.current && !!rates.data;

        if ((currencyChanged || ratesJustLoaded) && rates.data) {
            if (currency === 'SAR') {
                setMetadata('exchangeRate', 1);
                setMetadata('exchangeOperator', 'multiply');
            } else {
                const rateObj = (rates.data as { currency_code: string; rate_to_base: number }[])?.find(r => r.currency_code === currency);
                if (rateObj) {
                    setMetadata('exchangeRate', rateObj.rate_to_base);
                    const currencyConfig = (currencies.data as { code: string; exchange_operator: string }[])?.find(c => c.code === currency);
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
            const searchTerms = currency === 'SAR' ? ['SAR', 'سعودي', 'ريال سعودي'] : ['YER', 'يمني', 'ريال يمني'];
            const matchingAccount = paymentAccounts.find(acc =>
                acc.currency_code === currency ||
                searchTerms.some(term => acc.name.toLowerCase().includes(term.toLowerCase()))
            );

            if (matchingAccount) {
                setMetadata('cashboxId', matchingAccount.id);
            }
        }

        // 3. Handle Auto-Warehouse Selection (Once on load or when at default)
        if (warehouses && warehouses.length > 0 && (warehouseId === 'wh_main' || !warehouseId)) {
            const castWarehouses = warehouses as Record<string, unknown>[];
            const primary = castWarehouses.find((w) => w.is_primary);
            const target = primary || castWarehouses[0];
            if (target && warehouseId) {
                setMetadata('warehouseId', warehouseId as string);
            }
        }

        prevCurrency.current = currency;
    }, [currency, paymentAccounts, rates.data, warehouses, warehouseId, setMetadata]);

    const date = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

    return (
        <div className="bg-gray-50 dark:bg-slate-950/50 border-y-2 border-gray-100 dark:border-slate-800 flex flex-col lg:flex-row">
            <div className="lg:w-[40%] p-3 border-b lg:border-b-0 lg:border-l border-gray-100 dark:border-slate-800 flex items-center">
                <CustomerSelector />
            </div>
            <div className="flex-1 flex flex-col">
                <div className="flex -space-x-px">
                    <MetaBlock label="تاريخ الإصدار" value={date} icon={Calendar} colorClass="text-emerald-500" />
                    <MetaBlock label="رقم الفاتورة" value={invoiceNumber || '---'} icon={Hash} colorClass="text-blue-500" />
                    <MetaBlock
                        label="طريقة الدفع" field="invoiceType" value={invoiceType} icon={CreditCard} isSelect
                        options={[{ id: 'cash', label: 'نقداً (CASH)' }, { id: 'credit', label: 'آجل (CREDIT)' }]}
                        onChange={setMetadata}
                    />
                </div>
                <div className="flex -space-x-px border-t border-gray-100 dark:border-slate-800">
                    <MetaBlock label="العملة" field="currency" value={currency} icon={Coins} isSelect
                        options={(currencies.data as { code: string }[])?.map(c => ({ id: c.code, label: c.code })) || [{ id: 'SAR', label: 'SAR' }]}
                        onChange={setMetadata} />
                    {currency && currency !== 'SAR' && (
                        <div className="flex-1 bg-white dark:bg-slate-900/50 border-r border-gray-100 dark:border-slate-800 p-2.5 flex flex-col group hover:bg-gray-50/40 transition-colors">
                            <div className="flex items-center gap-1.5 mb-1.5">
                                <Coins size={12} className="text-amber-500" />
                                <span className="text-[9px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest">
                                    سعر الصرف {exchangeOperator === 'divide' ? '(القسمة ÷)' : '(الضرب ×)'}
                                </span>
                            </div>
                            <input
                                type="number"
                                step="0.00001"
                                value={exchangeRate ? (exchangeOperator === 'divide' ? parseFloat((1 / exchangeRate).toFixed(5)) : exchangeRate) : ''}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    if (!val) return;
                                    setMetadata('exchangeRate', exchangeOperator === 'divide' ? (1 / val) : val);
                                }}
                                className="bg-transparent text-sm font-bold text-amber-600 dark:text-amber-400 font-mono outline-none w-full"
                            />
                        </div>
                    )}
                    <MetaBlock label="حساب الصندوق" field="cashboxId" value={cashboxId} icon={Wallet} isSelect
                        options={paymentAccounts?.map(a => ({ id: a.id, label: a.name })) || []}
                        onChange={setMetadata} />
                    <MetaBlock label="الفرع / المخزن" field="warehouseId" value={warehouseId} icon={Warehouse} isSelect
                        options={warehouses?.map((w: Record<string, unknown>) => ({ id: w.id as string, label: w.name_ar as string })) || [{ id: 'wh_main', label: 'المستودع الرئيسي' }]}
                        onChange={setMetadata} />
                </div>
            </div>
        </div>
    );
};

export default InvoiceMeta;
