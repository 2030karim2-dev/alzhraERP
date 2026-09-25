import React from 'react';
import { Car, Plus } from 'lucide-react';
import Button from '../../../../ui/base/Button';

export interface VinsTabHeaderProps {
  onOpenManualModal: () => void;
}

export const VinsTabHeader: React.FC<VinsTabHeaderProps> = ({ onOpenManualModal }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="flex items-center gap-3">
      <div className="rounded-xl border border-blue-500/20 bg-blue-600/10 p-2.5 text-blue-600 dark:text-blue-400">
        <Car size={22} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 md:text-base">
          سجل الشواصي والمركبات المحفوظة
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          عرض تفاصيل ومواصفات المركبات باللغة العربية مع إمكانية استخراج القطع وإدارتها
        </p>
      </div>
    </div>

    <Button
      size="sm"
      variant="primary"
      onClick={onOpenManualModal}
      className="rounded-xl bg-blue-600 text-xs font-bold shadow-md shadow-blue-500/20 hover:bg-blue-700"
    >
      <Plus size={15} className="ml-1" />
      إدخال شاصي / مركبة يدوياً
    </Button>
  </div>
);
