import React, { useState } from 'react';
import { Calendar, Plus, Lock, ShieldAlert } from 'lucide-react';
import { useFiscalYears, useFiscalYearMutations } from '../hooks';
import { useAuthStore } from '../../auth/store';
import { assertOwner } from '../../../core/hooks/usePermission';
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
    addFiscalYear(data, {
      onSuccess: () => {
        setIsModalOpen(false);
      },
    });
  };

  const handleClose = (id: string) => {
    try {
      assertOwner(user);
      if (
        window.confirm('تحذير: إغلاق السنة المالية عملية لا يمكن التراجع عنها. هل تريد المتابعة؟')
      ) {
        closeFiscalYear(id);
      }
    } catch (error: unknown) {
      const err = error as Error;
      showToast(err.message || 'فشل إغلاق السنة المالية', 'error');
    }
  };

  if (isLoading)
    return <div className="animate-pulse p-8 text-center max-md:p-4">جاري تحميل...</div>;

  return (
    <div className="space-y-3 overflow-hidden rounded-xl border border-gray-200 bg-[var(--app-surface)] p-4 shadow-sm dark:border-slate-800 max-md:p-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold text-gray-700 dark:text-slate-300">السنوات المالية</h3>
        <Button
          onClick={() => {
            setIsModalOpen(true);
          }}
          size="sm"
          leftIcon={<Plus size={12} />}
        >
          سنة جديدة
        </Button>
      </div>

      <div className="space-y-2">
        {years?.map((year: any) => (
          <MicroListItem
            key={year.id}
            icon={year.is_closed ? Lock : Calendar}
            iconColorClass={year.is_closed ? 'text-gray-400' : 'text-purple-500'}
            title={`السنة المالية ${year.name}`}
            subtitle={`${year.start_date} → ${year.end_date}`}
            tags={[
              {
                label: year.is_closed ? 'مغلقة' : 'نشطة',
                color: year.is_closed ? 'slate' : 'emerald',
              },
            ]}
            actions={
              !year.is_closed && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    handleClose(year.id);
                  }}
                  className="rounded-lg p-1 text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 max-md:p-1.5"
                  title="إغلاق السنة"
                >
                  <ShieldAlert size={14} />
                </button>
              )
            }
          />
        ))}
      </div>

      <FiscalYearModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onSave={handleAdd}
        isSaving={isAdding}
      />
    </div>
  );
};

export default FiscalYearManager;
