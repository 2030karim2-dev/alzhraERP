import React from 'react';
import { Building, Globe } from 'lucide-react';
import Input from '../../../../ui/base/Input';
import type { UseFormRegister } from 'react-hook-form';

interface Props {
  register: UseFormRegister<any>;
}

const IdentitySection: React.FC<Props> = ({ register }) => (
  <div className="space-y-4">
    <div className="mb-1 flex items-center gap-1.5">
      <span className="h-3 w-0.5 rounded-full bg-blue-600"></span>
      <h3 className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
        هوية المنشأة
      </h3>
    </div>
    <Input label="اسم الشركة (بالعربية)" {...register('name')} icon={<Building size={16} />} />
    <Input
      label="اسم الشركة (بالانجليزية)"
      {...register('english_name')}
      dir="ltr"
      icon={<Globe size={16} />}
    />
  </div>
);

export default IdentitySection;
