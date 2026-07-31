
import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { DollarSign, Calendar, FileText, ArrowDown, ArrowUpCircle, ArrowRightLeft, Search, Landmark, Save, Tag, Building, Wallet } from 'lucide-react';
import { BondFormData, BondType } from '../types';
// Fix: Corrected import path to point to the barrel file.
import { useAccounts } from '../../accounting/hooks/index';
import { useCurrencies } from '../../settings/hooks';
import { useParties } from '../../parties/hooks';

import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import { cn, formatCurrency } from '../../../core/utils';
import { convertToBaseCurrency } from '../../../core/utils/currencyUtils';
import AIAssistantButton from '../../../ui/common/AIAssistantButton';

interface CreateBondModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: BondType;
  onSubmit: (data: BondFormData) => void;
  isSubmitting: boolean;
}

// Micro-Component for Styled Select Inputs
const AccountSelector: React.FC<any> = ({ label, icon: Icon, children, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{label}</label>
    <div className="relative">
      <select {...props} className="w-full p-3 bg-white dark:bg-slate-800 border-2 border-gray-100 dark:border-slate-700 focus:border-blue-500/50 rounded-xl text-sm font-bold outline-none appearance-none pr-10">
        {children}
      </select>
      <Icon className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
    </div>
  </div>
);

const CreateBondModal: React.FC<CreateBondModalProps> = ({ isOpen, onClose, type, onSubmit, isSubmitting }) => {

  const { data: allAccounts, isLoading: _isLoadingAccounts } = useAccounts();
  const { currencies, rates } = useCurrencies();
  const [partyQuery, setPartyQuery] = useState('');

  const { data: allParties } = useParties(type === 'receipt' ? 'customer' : 'supplier', partyQuery);

  const parties = useMemo(() => {
    return allParties || [];
  }, [allParties]);

  const { register, handleSubmit, reset, watch, setValue } = useForm<BondFormData>({
    defaultValues: { type, date: new Date().toISOString().split('T')[0], currency_code: 'SAR', exchange_rate: 1, counterparty_type: type === 'transfer' ? 'account' : 'party', payment_method: 'cash' }
  });

  const selectedCurrency = watch('currency_code');
  const counterpartyType = watch('counterparty_type');
  const currencyObj = currencies.data?.find((c: any) => c.code === selectedCurrency);
  const isDivide = currencyObj?.exchange_operator === 'divide';

  useEffect(() => {
    if (isOpen) {
      reset({ type, date: new Date().toISOString().split('T')[0], currency_code: 'SAR', exchange_rate: 1, counterparty_type: type === 'transfer' ? 'account' : 'party', payment_method: 'cash' });
      setPartyQuery('');
    }
  }, [isOpen, type, reset]);

  useEffect(() => {
    if (selectedCurrency === 'SAR') {
      setValue('exchange_rate', 1);
      setValue('foreign_amount', 0);
    } else {
      const rate = rates.data?.find((r: any) => r.currency_code === selectedCurrency);
      if (rate) setValue('exchange_rate', rate.rate_to_base);
    }
  }, [selectedCurrency, rates.data, setValue]);

  const foreignAmount = watch('foreign_amount');
  const exchangeRate = watch('exchange_rate');

  useEffect(() => {
    if (selectedCurrency !== 'SAR' && foreignAmount && exchangeRate) {
      try {
        const baseAmount = convertToBaseCurrency({
          amount: foreignAmount,
          currencyCode: selectedCurrency,
          exchangeRate: exchangeRate,
          exchangeOperator: currencyObj?.exchange_operator || 'multiply'
        });
        setValue('amount', baseAmount);
      } catch (e) {
        console.error('Conversion failed', e);
      }
    }
  }, [selectedCurrency, foreignAmount, exchangeRate, currencyObj, setValue]);

  const { cashAccounts, otherAccounts } = useMemo(() => {
    const cash = allAccounts?.filter(acc => acc.code.startsWith('10')) || [];
    const others = allAccounts?.filter(acc => !acc.code.startsWith('10')) || [];
    return { cashAccounts: cash, otherAccounts: others };
  }, [allAccounts]);

  const handlePartySelect = (party: any) => {
    setValue('counterparty_id', party.id);
    setPartyQuery(party.name);
  };

  const theme = type === 'receipt'
    ? { color: 'emerald', icon: ArrowDown, title: 'سند قبض جديد', description: 'تسجيل عملية قبض نقدية أو بنكية' }
    : type === 'transfer'
      ? { color: 'blue', icon: ArrowRightLeft, title: 'تحويل داخلي جديد', description: 'تحويل مبالغ بين الخزائن والحسابات البنكية' }
      : { color: 'rose', icon: ArrowUpCircle, title: 'سند صرف جديد', description: 'تسجيل عملية صرف نقدية أو بنكية' };

  const footer = (
    <div className="flex w-full gap-3 p-1">
      <Button onClick={onClose} variant="outline" className="flex-1 py-6 text-xs font-bold uppercase transition-all hover:bg-gray-100 dark:hover:bg-slate-800">إلغاء</Button>
      <Button
        onClick={handleSubmit(onSubmit)}
        isLoading={isSubmitting}
        variant={type === 'receipt' ? 'success' : (type === 'transfer' ? 'primary' : 'danger')}
        className="flex-[2] py-6 text-xs font-bold shadow-xl shadow-blue-500/10 uppercase group"
        leftIcon={<Save size={18} className="group-hover:scale-110 transition-transform" />}
      >
        اعتماد السند وحفظه
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={theme.icon}
      title={theme.title}
      description={theme.description}
      footer={footer}
      size="full"
    >
      <form className="space-y-6 max-w-5xl mx-auto">
        <div className="p-3 mb-2 rounded-2xl border dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-900/10 flex justify-between items-center bg-[url('/bg-pattern.svg')] bg-cover">
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-indigo-800 dark:text-indigo-300">مساعد الإدخال الذكي</span>
            <span className="text-[9px] text-indigo-600/70 dark:text-indigo-400/70 font-bold">اشرح تفاصيل السند وسيقوم المساعد بتعبئته.</span>
          </div>
          <AIAssistantButton
            promptDescription={`أنت تقوم بإنشاء سند من نوع: ${theme.title}. استنتج المبلغ المطلوب، العملة، الحساب المقابل/الجهة، حساب الدفع/القبض، والبيان من طلب المستخدم بالرجوع لقوائم الحسابات والجهات.`}
            schemaDescription={`{
  "amount": "المبلغ كرقم",
  "currency_code": "رمز العملة (اختياري، الافتراضي SAR)",
  "counterparty_type": "party إذا كان خصماً لحساب عميل أو مورد، أو account إذا كان حساباً عاماً",
  "counterparty_id": "معرف (ID) الحساب المقابل أو الجهة المطابقة. استخدم قوائم parties أو otherAccounts أو cashAccounts",
  "cash_account_id": "معرف (ID) حساب الصندوق أو البنك للعملية. استخدم قائمة cashAccounts",
  "description": "بيان السند",
  "date": "تاريخ السند بصيغة YYYY-MM-DD (اختياري)"
}`}
            contextData={{
               parties: parties.map((p: any) => ({ id: p.id, name: p.name, type: p.type })),
               cashAccounts: cashAccounts.map(a => ({ id: a.id, name: a.name })),
               otherAccounts: otherAccounts.map(a => ({ id: a.id, name: a.name }))
            }}
            onDataExtracted={(data) => {
               type BondAIData = {
                 amount?: number; currency_code?: string;
                 counterparty_type?: 'party' | 'account'; counterparty_id?: string;
                 cash_account_id?: string; description?: string; date?: string;
               };
               const d = data as BondAIData;
               if (d.amount) setValue(selectedCurrency === 'SAR' ? 'amount' : 'foreign_amount', d.amount, { shouldValidate: true });
               if (d.currency_code) setValue('currency_code', d.currency_code, { shouldValidate: true });
               if (d.counterparty_type) setValue('counterparty_type', d.counterparty_type, { shouldValidate: true });
               
               if (d.counterparty_id) {
                   setValue('counterparty_id', d.counterparty_id, { shouldValidate: true });
                   if (d.counterparty_type === 'party') {
                       const foundParty = parties.find((p) => p.id === d.counterparty_id);
                       if (foundParty) setPartyQuery((foundParty as { name: string }).name);
                   }
               }
               
               if (d.cash_account_id) setValue('cash_account_id', d.cash_account_id, { shouldValidate: true });
               if (d.description) setValue('description', d.description, { shouldValidate: true });
               if (d.date) setValue('date', d.date, { shouldValidate: true });
            }}
          />
        </div>

        {/* Step 1: Head - Amount & Currency */}
        <div className={cn(
          "p-8 rounded-3xl border-2 transition-all shadow-md flex flex-col md:flex-row items-center gap-8",
          type === 'receipt' ? "bg-emerald-50/40 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800/20" : 
          type === 'transfer' ? "bg-blue-50/40 border-blue-100 dark:bg-blue-900/10 dark:border-blue-800/20" :
          "bg-rose-50/40 border-rose-100 dark:bg-rose-900/10 dark:border-rose-800/20"
        )}>
          <div className="flex-1 w-full relative">
            <label className={cn("inline-block text-xs font-black uppercase tracking-widest px-3 py-1 rounded-t-xl mb-0.5", 
              type === 'receipt' ? "bg-emerald-600 text-white" : 
              type === 'transfer' ? "bg-blue-600 text-white" :
              "bg-rose-600 text-white"
            )}>
              المبلغ {selectedCurrency}
            </label>
            <div className="relative group">
              <input
                type="number"
                step="0.01"
                {...register(selectedCurrency === 'SAR' ? 'amount' : 'foreign_amount', {
                  required: true,
                  valueAsNumber: true,
                  min: 0.01
                })}
                className={cn(
                  "w-full px-8 py-6 bg-white dark:bg-slate-950 border-2 rounded-2xl text-5xl font-black outline-none transition-all font-mono",
                  type === 'receipt' ? "border-emerald-200 focus:border-emerald-500 text-emerald-600 dark:border-emerald-800/50" : 
                  type === 'transfer' ? "border-blue-200 focus:border-blue-500 text-blue-600 dark:border-blue-800/50" :
                  "border-rose-200 focus:border-rose-500 text-rose-600 dark:border-rose-800/50"
                )}
                placeholder="0.00"
              />
              <DollarSign className={cn("absolute left-6 top-1/2 -translate-y-1/2 opacity-20", 
                type === 'receipt' ? "text-emerald-600" : 
                type === 'transfer' ? "text-blue-600" :
                "text-rose-600"
              )} size={48} />
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-6 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-xl">

            <div className="w-full md:w-32">
              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-2 text-center">العملة</label>
              <div className="relative">
                <select {...register('currency_code')} className="w-full bg-slate-50 dark:bg-slate-800 border-2 dark:border-slate-700 py-3 px-4 rounded-xl text-sm font-black outline-none appearance-none hover:border-blue-500 transition-colors cursor-pointer text-center">
                  <option value="SAR">SAR</option>
                  {currencies.data?.filter((c: any) => c.code !== 'SAR').map((c: any) => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
                <Tag className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>
            </div>

            {selectedCurrency !== 'SAR' && (
              <>
                <div className="w-full md:w-40">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-2 text-center">سعر الصرف {isDivide ? '÷' : '×'}</label>
                  <div className="relative group">
                    <input
                      type="number"
                      step="0.000001"
                      {...register('exchange_rate', { required: true, valueAsNumber: true })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 dark:border-slate-700 rounded-xl text-sm font-black font-mono text-center outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="w-full md:w-44">
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-2 text-center">المقابل بالريال (SAR)</label>
                  <div className="w-full px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10 border-2 border-dashed border-blue-200 dark:border-blue-800/50 rounded-xl text-sm font-black text-blue-600 dark:text-blue-400 font-mono text-center">
                    {formatCurrency(watch('amount') || 0)}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Step 2: Grid for Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account/Party Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 px-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-lg uppercase tracking-tighter">الحسابات والجهات</div>
              </div>

              <div className="space-y-3">
                <div className={cn("flex h-11 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-2xl border dark:border-slate-800", type === 'transfer' && "opacity-50 pointer-events-none")}>
                  <button type="button" onClick={() => setValue('counterparty_type', 'party')} className={cn("flex-1 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all", counterpartyType === 'party' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-md" : "text-gray-400 hover:text-gray-500")}><Building size={14} /> جهة (عميل/مورد)</button>
                  <button type="button" onClick={() => setValue('counterparty_type', 'account')} className={cn("flex-1 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all", counterpartyType === 'account' ? "bg-white dark:bg-slate-700 text-blue-600 shadow-md" : "text-gray-400 hover:text-gray-500")}><Landmark size={14} /> حساب عام</button>
                </div>

                {counterpartyType === 'party' ? (
                  <div className="relative group">
                    <input
                      type="text"
                      value={partyQuery}
                      onChange={(e) => setPartyQuery(e.target.value)}
                      placeholder="ابحث عن العميل أو المورد..."
                      className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/30 dark:focus:border-blue-500/20 rounded-2xl text-sm font-bold outline-none transition-all placeholder:text-gray-300"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                    {partyQuery.length > 1 && parties.length > 0 && (
                      <div className="absolute z-20 w-full mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-h-56 overflow-auto border dark:border-slate-700 animate-in fade-in zoom-in-95 backdrop-blur-xl">
                        {parties.map((p: any) => (
                          <div key={p.id} onClick={() => handlePartySelect(p)} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer flex justify-between items-center border-b last:border-0 dark:border-slate-700/50 transition-colors">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-800 dark:text-slate-100">{p.name}</span>
                              <span className="text-[10px] text-gray-400 font-bold">{p.code || p.phone || p.id.split('-')[0]}</span>
                            </div>
                            <span className={cn(
                              "text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm",
                              p.type === 'customer' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30'
                            )}>{p.type === 'customer' ? 'عميل' : 'مورد'}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <AccountSelector 
                    label={type === 'transfer' ? "الحساب المحول إليه" : "الحساب المقابل"} 
                    icon={Landmark} 
                    {...register('counterparty_id', { required: true })}
                  >
                    <option value="">-- اختر الحساب {type === 'transfer' ? 'الهدف' : ''} --</option>
                    {type === 'transfer' ? cashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>) : otherAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                  </AccountSelector>
                )}
              </div>

              <AccountSelector
                label={type === 'transfer' ? "الحساب المحول منه" : "الصندوق أو البنك"}
                icon={Wallet}
                {...register('cash_account_id', { required: true })}
              >
                <option value="">-- اختر الحساب {type === 'transfer' ? 'المصدر' : ''} --</option>
                {cashAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
              </AccountSelector>
            </div>
          </div>

          {/* Reference & Info Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm space-y-6 flex-1 h-full">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1 px-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-lg uppercase tracking-tighter">بيانات إضافية</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input label="تاريخ السند" type="date" {...register('date', { required: true })} dir="ltr" icon={<Calendar className="text-gray-400" />} />
                <Input label="رقم المرجع (يدوي)" {...register('reference_number')} placeholder="Manual ID..." dir="ltr" icon={<FileText className="text-gray-400" />} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">البيان (شرح السند)</label>
                <div className="relative group">
                  <textarea
                    {...register('description', { required: true })}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/30 rounded-2xl text-sm font-bold min-h-[100px] outline-none transition-all placeholder:text-gray-300 resize-none"
                    placeholder="أدخل تفاصيل ومبررات السند هنا..."
                  ></textarea>
                  <Tag className="absolute left-4 bottom-4 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default CreateBondModal;