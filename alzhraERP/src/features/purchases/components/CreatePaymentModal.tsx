import React, { useEffect, useState } from 'react';
import { X, Loader2, Search, Banknote, Calendar, ShieldCheck, Wallet } from 'lucide-react';
import { useCreatePayment } from '../hooks';
import { useParties } from '../../parties/hooks';
import type { Party } from '../../parties/types';
import {
  useCashPaymentAccounts,
  useExchangePaymentAccounts,
  type PaymentAccount,
} from '../../accounting/hooks/usePaymentAccounts';
import { formatCurrency, formatLocalDate } from '../../../core/utils';

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SupplierPickerProps {
  selectedSupplier: Party | null;
  supplierQuery: string;
  isDropdownOpen: boolean;
  suppliers: Party[];
  onQueryChange: (query: string) => void;
  onSelect: (supplier: Party) => void;
  onClear: () => void;
}

interface PaymentFieldsProps {
  amount: string;
  method: 'cash' | 'bank';
  date: string;
  onAmountChange: (value: string) => void;
  onMethodChange: (value: 'cash' | 'bank') => void;
  onDateChange: (value: string) => void;
}

const SupplierPicker: React.FC<SupplierPickerProps> = ({
  selectedSupplier,
  supplierQuery,
  isDropdownOpen,
  suppliers,
  onQueryChange,
  onSelect,
  onClear,
}) => (
  <div className="space-y-2">
    <label
      htmlFor="purchase-payment-supplier"
      className="block text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500"
    >
      المورد المستفيد
    </label>
    {selectedSupplier === null ? (
      <div className="relative">
        <input
          id="purchase-payment-supplier"
          type="text"
          value={supplierQuery}
          onChange={event => {
            onQueryChange(event.target.value);
          }}
          placeholder="ابحث عن اسم المورد..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 pl-4 pr-11 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
          dir="ltr"
        />
        <Search className="absolute right-4 top-3.5 text-gray-400 dark:text-slate-500" size={20} />
        {isDropdownOpen && supplierQuery.length > 1 && (
          <div className="animate-in fade-in slide-in-from-top-2 absolute z-10 mt-2 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-100 bg-[var(--app-surface)] shadow-2xl dark:border-slate-800">
            {suppliers.map(supplier => (
              <button
                key={supplier.id}
                type="button"
                onClick={() => {
                  onSelect(supplier);
                }}
                className="group flex w-full cursor-pointer items-center justify-between border-b border-gray-50 p-4 text-right transition-colors last:border-none hover:bg-purple-50 dark:border-slate-800/50 dark:hover:bg-slate-800"
              >
                <span className="font-extrabold text-gray-700 transition-colors group-hover:text-purple-600 dark:text-slate-200">
                  {supplier.name}
                </span>
                <span
                  dir="ltr"
                  className={`rounded-md border px-2 py-1 text-xs font-bold ${(supplier.balance ?? 0) < 0 ? 'border-red-100 bg-red-50 text-red-600 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-400' : 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-900/20 dark:text-emerald-400'}`}
                >
                  {formatCurrency(supplier.balance ?? 0)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    ) : (
      <div className="flex items-center justify-between rounded-lg border border-purple-100 bg-purple-50 p-4 transition-colors dark:border-purple-900/30 dark:bg-purple-900/20">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-purple-200 font-bold text-purple-700 dark:bg-purple-900/40 dark:text-purple-400">
            {selectedSupplier.name.charAt(0)}
          </div>
          <div>
            <div className="font-extrabold text-gray-800 dark:text-slate-100">
              {selectedSupplier.name}
            </div>
            <div dir="ltr" className="mt-0.5 text-xs font-bold text-gray-500 dark:text-slate-500">
              الرصيد:{' '}
              <span
                className={
                  (selectedSupplier.balance ?? 0) < 0 ? 'text-red-500' : 'text-emerald-500'
                }
              >
                {formatCurrency(selectedSupplier.balance ?? 0)}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onClear();
          }}
          className="rounded-md p-1.5 text-gray-400 shadow-sm transition-all hover:bg-white hover:text-red-500 dark:hover:bg-slate-800"
        >
          <X size={18} />
        </button>
      </div>
    )}
  </div>
);

const PaymentFields: React.FC<PaymentFieldsProps> = ({
  amount,
  method,
  date,
  onAmountChange,
  onMethodChange,
  onDateChange,
}) => (
  <div className="grid grid-cols-3 gap-4">
    <div className="space-y-2">
      <label
        htmlFor="purchase-payment-amount"
        className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500"
      >
        المبلغ المدفوع
      </label>
      <div className="relative">
        <input
          id="purchase-payment-amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={event => {
            onAmountChange(event.target.value);
          }}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 pl-4 pr-11 text-left font-mono text-xl font-bold transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
          placeholder="0.00"
          required
          dir="ltr"
        />
        <div className="absolute right-3.5 top-4 text-[10px] font-bold text-gray-400 dark:text-slate-500">
          SAR
        </div>
      </div>
    </div>
    <div className="space-y-2">
      <label
        htmlFor="purchase-payment-method"
        className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500"
      >
        طريقة الدفع
      </label>
      <select
        id="purchase-payment-method"
        value={method}
        onChange={event => {
          onMethodChange(event.target.value as 'cash' | 'bank');
        }}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
      >
        <option value="cash">نقداً</option>
        <option value="bank">تحويل بنكي</option>
      </select>
    </div>
    <div className="space-y-2">
      <label
        htmlFor="purchase-payment-date"
        className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500"
      >
        تاريخ السند
      </label>
      <div className="relative">
        <input
          id="purchase-payment-date"
          type="date"
          value={date}
          onChange={event => {
            onDateChange(event.target.value);
          }}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-3 pl-4 pr-11 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
          required
          dir="ltr"
        />
        <Calendar
          className="absolute right-3.5 top-3.5 text-gray-400 dark:text-slate-500"
          size={18}
        />
      </div>
    </div>
  </div>
);

interface PaymentFooterProps {
  isPending: boolean;
  canSubmit: boolean;
  onClose: () => void;
}
const PaymentFooter: React.FC<PaymentFooterProps> = ({ isPending, canSubmit, onClose }) => (
  <div className="flex gap-3 pt-2">
    <button
      type="button"
      onClick={onClose}
      className="flex-1 rounded-lg py-3.5 font-bold text-gray-600 shadow-sm transition-all hover:bg-gray-50 dark:text-slate-400 dark:hover:bg-slate-800"
    >
      إلغاء
    </button>
    <button
      type="submit"
      disabled={isPending || !canSubmit}
      className="flex flex-[2] items-center justify-center gap-2 rounded-lg bg-purple-600 py-3.5 font-bold text-white shadow-xl shadow-purple-500/20 transition-all hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {isPending ? <Loader2 className="animate-spin" size={20} /> : <ShieldCheck size={20} />}
      <span>حفظ وترحيل السند</span>
    </button>
  </div>
);

interface TreasuryPickerProps {
  accounts: PaymentAccount[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/** منتقي الحساب المالي لسند الصرف — يستبدل الارتباط الثابت بحساب '1010' */
const TreasuryPicker: React.FC<TreasuryPickerProps> = ({ accounts, selectedId, onSelect }) => (
  <div className="space-y-2">
    <label
      htmlFor="purchase-payment-treasury"
      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500"
    >
      <Wallet size={12} />
      الحساب المالي (الخزينة / البنك)
    </label>
    {accounts.length === 0 ? (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-700 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-400">
        لا توجد خزائن متاحة — أنشئ خزينة من صفحة المحاسبة أولاً
      </div>
    ) : (
      <select
        id="purchase-payment-treasury"
        dir="rtl"
        value={selectedId ?? ''}
        onChange={event => {
          onSelect(event.target.value);
        }}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-100"
      >
        {accounts.map(account => (
          <option key={account.id} value={account.id}>
            {account.name_ar} ({account.currency_code}) · {formatCurrency(account.balance)}
          </option>
        ))}
      </select>
    )}
  </div>
);

const CreatePaymentModal: React.FC<CreatePaymentModalProps> = ({ isOpen, onClose }) => {
  const { mutate: createPayment, isPending } = useCreatePayment();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => formatLocalDate());
  const [method, setMethod] = useState<'cash' | 'bank'>('cash');
  const [notes, setNotes] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Party | null>(null);
  const [supplierQuery, setSupplierQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [treasuryAccountId, setTreasuryAccountId] = useState<string | null>(null);
  const { data: suppliers } = useParties('supplier', supplierQuery);
  // نقداً → الصناديق النشطة، بنكياً → شركات الصرافة المرتبطة بحسابات دفترية
  const { data: cashAccounts } = useCashPaymentAccounts();
  const { data: exchangeAccounts } = useExchangePaymentAccounts();
  const treasuryOptions: PaymentAccount[] =
    method === 'bank' ? (exchangeAccounts ?? []) : (cashAccounts ?? []);

  // إبقاء الاختيار صالحاً عند تغيير طريقة الدفع أو تحميل القوائم، مع افتراضي أول حساب
  useEffect(() => {
    setTreasuryAccountId(prev =>
      prev !== null && treasuryOptions.some(account => account.id === prev)
        ? prev
        : (treasuryOptions[0]?.id ?? null)
    );
  }, [method, treasuryOptions.length]);

  const handleTreasurySelect = (id: string): void => {
    setTreasuryAccountId(id !== '' ? id : null);
  };

  const handleSubmit = (event: React.SyntheticEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (selectedSupplier === null || amount === '' || treasuryAccountId === null) return;
    createPayment(
      {
        supplierId: selectedSupplier.id,
        amount: parseFloat(amount),
        date,
        method,
        notes,
        treasuryAccountId,
      },
      {
        onSuccess: () => {
          onClose();
          setAmount('');
          setSelectedSupplier(null);
          setSupplierQuery('');
          setNotes('');
          setMethod('cash');
        },
      }
    );
  };
  const selectSupplier = (supplier: Party): void => {
    setSelectedSupplier(supplier);
    setSupplierQuery('');
    setIsDropdownOpen(false);
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="animate-in fade-in zoom-in my-auto w-full max-w-lg rounded-none border bg-[var(--app-surface)] shadow-2xl duration-200 dark:border-slate-800">
        <div className="flex items-center justify-between rounded-none border-b border-gray-100 bg-gray-50/50 p-6 dark:border-slate-800 dark:bg-slate-800/30">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-purple-600/10 p-2 text-purple-600">
              <Banknote size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">سند صرف جديد</h2>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                تسجيل دفعة نقدية أو بنكية للمورد
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-red-500"
          >
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <SupplierPicker
            selectedSupplier={selectedSupplier}
            supplierQuery={supplierQuery}
            isDropdownOpen={isDropdownOpen}
            suppliers={suppliers}
            onQueryChange={query => {
              setSupplierQuery(query);
              setIsDropdownOpen(true);
            }}
            onSelect={selectSupplier}
            onClear={() => {
              setSelectedSupplier(null);
            }}
          />
          <PaymentFields
            amount={amount}
            method={method}
            date={date}
            onAmountChange={setAmount}
            onMethodChange={setMethod}
            onDateChange={setDate}
          />
          <TreasuryPicker
            accounts={treasuryOptions}
            selectedId={treasuryAccountId}
            onSelect={handleTreasurySelect}
          />
          <div className="space-y-2">
            <label
              htmlFor="purchase-payment-notes"
              className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500"
            >
              البيان / الوصف
            </label>
            <textarea
              id="purchase-payment-notes"
              value={notes}
              onChange={event => {
                setNotes(event.target.value);
              }}
              className="h-28 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 p-4 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200"
            />
          </div>
          <PaymentFooter
            isPending={isPending}
            canSubmit={selectedSupplier !== null && amount !== '' && treasuryAccountId !== null}
            onClose={onClose}
          />
        </form>
      </div>
    </div>
  );
};

export default CreatePaymentModal;
