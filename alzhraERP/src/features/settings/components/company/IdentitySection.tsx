
import React from 'react';
import { Building, Globe } from 'lucide-react';
import Input from '../../../../ui/base/Input';
import { UseFormRegister } from 'react-hook-form';

interface Props {
  register: UseFormRegister<any>;
}

const IdentitySection: React.FC<Props> = ({ register }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-1.5 mb-1">
      <span className="w-0.5 h-3 bg-blue-600 rounded-full"></span>
      <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em]">هوية المنشأة</h3>
    </div>
    <Input label="اسم الشركة (بالعربية)" placeholder="شركة الزهراء لقطع الغيار" {...register('name')} icon={<Building size={16} />} />
    <Input label="اسم الشركة (بالانجليزية)" placeholder="Al Zahra Auto Parts" {...register('english_name')} dir="ltr" icon={<Globe size={16} />} />
  </div>
);

export default IdentitySection;
