import React from 'react';
import { Car, Plus } from 'lucide-react';
import Button from '../../../../ui/base/Button';

export interface EmptyVinsStateProps {
  onOpenManualModal: () => void;
}

export const EmptyVinsState: React.FC<EmptyVinsStateProps> = ({ onOpenManualModal }) => (
  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-500 dark:border-blue-900 dark:bg-blue-950/40">
      <Car size={32} />
    </div>
    <div className="mx-auto max-w-md space-y-1">
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
        لا توجد شواصي أو مركبات محفوظة حتى الآن
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        يمكنك فك رقم شاصي من تبويب «فك الشاصي» وحفظه، أو إضافة مركبة ومواصفاتها يدوياً الآن.
      </p>
    </div>
    <Button
      size="md"
      variant="primary"
      onClick={onOpenManualModal}
      className="rounded-xl bg-blue-600 px-5 text-xs font-bold shadow-sm hover:bg-blue-700"
    >
      <Plus size={15} className="ml-1" />+ إضافة أول شاصي يدوياً
    </Button>
  </div>
);
