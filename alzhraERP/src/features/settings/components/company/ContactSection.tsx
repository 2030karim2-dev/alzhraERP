
import React from 'react';
import { Hash } from 'lucide-react';
import Input from '../../../../ui/base/Input';
import { UseFormRegister } from 'react-hook-form';

interface Props {
  register: UseFormRegister<any>;
}

const ContactSection: React.FC<Props> = ({ register }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-1.5 mb-1">
      <span className="w-0.5 h-3 bg-emerald-500 rounded-full"></span>
      <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">المعلومات المالية والضريبية</h3>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-gray-400 uppercase mr-1">العملة الأساسية</label>
        <select {...register('base_currency')} className="w-full bg-gray-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500/20 rounded-xl py-2.5 px-3 text-[11px] font-bold outline-none dark:text-slate-200">
          <option value="SAR">SAR - ريال سعودي</option>
          <option value="USD">USD - دولار أمريكي</option>
          <option value="YER">YER - ريال يمني</option>
        </select>
      </div>
      <Input label="الرقم الضريبي" placeholder="300XXXXXXXXXXXX" {...register('tax_number')} dir="ltr" icon={<Hash size={16} />} />
    </div>
  </div>
);

export default ContactSection;
