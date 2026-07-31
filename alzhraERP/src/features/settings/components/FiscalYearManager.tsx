
import React, { useState } from 'react';
import { Calendar, Plus, Lock, ShieldAlert } from 'lucide-react';
import { useFiscalYears, useFiscalYearMutations } from '../hooks';
import { useAuthStore } from '../../auth/store';
import { AuthorizeActionUsecase } from '../../../core/usecases/auth/AuthorizeActionUsecase';
import { useFeedbackStore } from '../../feedback/store';
import MicroListItem from '../../../ui/common/MicroListItem';
import Button from '../../../ui/base/Button';
import FiscalYearModal from './financial/FiscalYearModal';

const FiscalYearManager: React.FC = () => {
  const { data: years, isLoading } = useFiscalYears();
  const { addFiscalYear, closeFiscalYear, isAdding } = useFiscalYearMutations();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAdd = (data: any) => {
    addFiscalYear(data, { onSuccess: () => setIsModalOpen(false) });
  };

  const handleClose = (id: string) => {
    try {
      AuthorizeActionUsecase.requireAdmin(user as any);
      if (window.confirm('تحذير: إغلاق السنة المالية عملية لا يمكن التراجع عنها. هل تريد المتابعة؟')) {
        closeFiscalYear(id);
      }
    } catch (error: unknown) {
      const err = error as Error;
      showToast(err.message || 'فشل إغلاق السنة المالية', 'error');
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse">جاري تحميل...</div>;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-3">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300">السنوات المالية</h3>
        <Button onClick={() => setIsModalOpen(true)} size="sm" leftIcon={<Plus size={12} />}>سنة جديدة</Button>
      </div>

      <div className="space-y-2">
        {years?.map((year: any) => (
          <MicroListItem
            key={year.id}
            icon={year.is_closed ? Lock : Calendar}
            iconColorClass={year.is_closed ? "text-gray-400" : "text-purple-500"}
            title={`السنة المالية ${year.name}`}
            subtitle={`${year.start_date} → ${year.end_date}`}
            tags={[{ label: year.is_closed ? 'مغلقة' : 'نشطة', color: year.is_closed ? 'slate' : 'emerald' }]}
            actions={!year.is_closed && (
              <button onClick={(e) => { e.stopPropagation(); handleClose(year.id); }} className="p-1.5 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg" title="إغلاق السنة">
                <ShieldAlert size={14} />
              </button>
            )}
          />
        ))}
      </div>

      <FiscalYearModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleAdd}
        isSaving={isAdding}
      />
    </div>
  );
};

export default FiscalYearManager;
