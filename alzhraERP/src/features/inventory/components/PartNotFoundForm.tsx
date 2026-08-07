import React, { useState } from 'react';
import { SearchX, Send, Package, Hash, Car } from 'lucide-react';
import Button from '../../../ui/base/Button';
import Input from '../../../ui/base/Input';
import { cn } from '../../../core/utils';

interface PartNotFoundFormProps {
  searchTerm: string;
  onSubmit: (data: { partNumber: string; description: string; brand: string; vehicle: string }) => void;
  onClose?: () => void;
  className?: string;
}

const PartNotFoundForm: React.FC<PartNotFoundFormProps> = ({
  searchTerm, onSubmit, onClose, className,
}) => {
  const [partNumber, setPartNumber] = useState(searchTerm);
  const [description, setDescription] = useState('');
  const [brand, setBrand] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!partNumber.trim()) return;
    onSubmit({ partNumber: partNumber.trim(), description: description.trim(), brand: brand.trim(), vehicle: vehicle.trim() });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className={cn('flex flex-col items-center text-center p-6 animate-in zoom-in-95 duration-300', className)}>
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
          <Send size={28} className="text-emerald-600" />
        </div>
        <h3 className="text-sm font-bold text-[var(--app-text)] mb-1">تم إرسال الطلب</h3>
        <p className="text-xs text-[var(--app-text-secondary)]">سيتم إشعار قسم المشتريات لتوفير القطعة المطلوبة</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={cn('p-4 space-y-3', className)}>
      <div className="flex items-center gap-2 mb-2">
        <SearchX size={18} className="text-rose-500" />
        <div>
          <h3 className="text-sm font-bold text-[var(--app-text)]">لم يتم العثور على القطعة</h3>
          <p className="text-[10px] text-[var(--app-text-secondary)]">أرسل طلب توفير لقسم المشتريات</p>
        </div>
      </div>

      <Input
        label="رقم القطعة" placeholder="أدخل رقم القطعة"
        icon={<Hash size={14} />} value={partNumber}
        onChange={e => setPartNumber(e.target.value)}
        required
      />
      <Input
        label="الوصف (اختياري)" placeholder="وصف مختصر للقطعة"
        icon={<Package size={14} />} value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <Input
          label="الماركة" placeholder="مثلاً: Bosch"
          value={brand} onChange={e => setBrand(e.target.value)}
        />
        <Input
          label="المركبة" placeholder="مثلاً: Corolla 2020"
          icon={<Car size={14} />} value={vehicle}
          onChange={e => setVehicle(e.target.value)}
        />
      </div>

      <Button type="submit" variant="primary" fullWidth leftIcon={<Send size={14} />}>
        إرسال طلب التوفير
      </Button>
    </form>
  );
};

export default PartNotFoundForm;
