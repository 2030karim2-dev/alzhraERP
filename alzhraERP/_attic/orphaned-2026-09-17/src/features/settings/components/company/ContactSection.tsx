import React from 'react';
import { Hash } from 'lucide-react';
import Input from '../../../../ui/base/Input';
import type { UseFormRegister } from 'react-hook-form';

interface Props {
  register: UseFormRegister<any>;
}

const ContactSection: React.FC<Props> = ({ register }) => (
  <div className="space-y-4">
    <div className="mb-1 flex items-center gap-1.5">
      <span className="h-3 w-0.5 rounded-full bg-emerald-500"></span>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
        المعلومات المالية والضريبية
      </h3>
    </div>
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1">
        <label className="mr-1 text-[10px] font-bold uppercase text-gray-400">
          العملة الأساسية
        </label>
        <select
          {...register('base_currency')}
          className="w-full rounded-xl border-2 border-transparent bg-gray-50 px-3 py-2.5 text-[11px] font-bold outline-none focus:border-blue-500/20 dark:bg-slate-800 dark:text-slate-200"
        >
          <option value="SAR">SAR - ريال سعودي</option>
          <option value="USD">USD - دولار أمريكي</option>
          <option value="YER">YER - ريال يمني</option>
        </select>
      </div>
      <Input
        label="الرقم الضريبي"
        {...register('tax_number')}
        dir="ltr"
        icon={<Hash size={16} />}
      />
    </div>
  </div>
);

export default ContactSection;
