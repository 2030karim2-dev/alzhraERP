import React, { useState } from 'react';
import { ClipboardCheck, Database, CheckCircle2, Info } from 'lucide-react';
import { useWarehouses, useInventoryMutations, useAuditSessions } from '../hooks/index';
import Button from '../../../ui/base/Button';
import Modal from '../../../ui/base/Modal';
import { cn } from '../../../core/utils';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../core/routes/paths';
import { useFeedbackStore } from '../../feedback/store';

interface StartAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const StartAuditModal: React.FC<StartAuditModalProps> = ({ isOpen, onClose }) => {
  const { data: warehouses } = useWarehouses();
  const { startAudit, isStartingAudit } = useInventoryMutations();
  const { data: auditSessions } = useAuditSessions();
  const navigate = useNavigate();
  const { showToast } = useFeedbackStore();

  const [formData, setFormData] = useState({
    title: `جرد دوري - ${new Date().toLocaleDateString('ar-SA-u-nu-latn')}`,
    warehouse_id: '',
  });

  if (!isOpen) return null;

  const handleStart = () => {
    if (!formData.warehouse_id || !formData.title) return;

    const hasActiveSession = auditSessions?.some(
      s => s.warehouse_id === formData.warehouse_id && s.status === 'active'
    );
    if (hasActiveSession) {
      showToast(
        'تنبيه: يوجد جلسة جرد نشطة مسبقاً لهذا المستودع. لا يمكنك بدء جلسة جديدة قبل إنهاء الجلسة الحالية لتجنب تضارب الأرصدة.',
        'warning'
      );
      return;
    }

    startAudit(formData, {
      onSuccess: (session: { id?: string } | null) => {
        onClose();
        if (session?.id) {
          navigate(ROUTES.DASHBOARD.INVENTORY_AUDIT_SESSION.replace(':sessionId', session.id));
        }
      },
    });
  };

  const footerContent = (
    <>
      <Button variant="outline" onClick={onClose} className="flex-1">
        إلغاء
      </Button>
      <Button
        onClick={handleStart}
        isLoading={isStartingAudit}
        disabled={!formData.warehouse_id || !formData.title}
        className="flex-1"
      >
        بدء الجلسة الآن
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={ClipboardCheck}
      title="بدء جلسة جرد ميداني"
      description="إنشاء تقرير لمطابقة الكميات الفعلية مع المسجلة بالنظام"
      footer={footerContent}
      size="xl"
    >
      <div className="space-y-6">
        <div className="flex gap-4 rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/20 dark:bg-blue-900/10">
          <Info size={24} className="flex-shrink-0 text-blue-600" />
          <p className="text-xs font-bold leading-relaxed text-blue-800 dark:text-blue-300">
            يفضل استخدام باركود الأصناف أثناء الجرد لزيادة الدقة وسرعة الإنجاز.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="mr-1 text-xs font-bold uppercase text-gray-400">اسم جلسة الجرد</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => {
                setFormData({ ...formData, title: e.target.value });
              }}
              className="w-full rounded-lg border bg-gray-50 px-4 py-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
            />
          </div>

          <div className="space-y-1.5">
            <label className="mr-1 text-xs font-bold uppercase text-gray-400">
              المستودع المستهدف
            </label>
            <div className="grid grid-cols-1 gap-2">
              {warehouses?.map((w: { id: string; name_ar?: string; name?: string }) => (
                <button
                  key={w.id}
                  onClick={() => {
                    setFormData({ ...formData, warehouse_id: w.id });
                  }}
                  className={cn(
                    'flex items-center justify-between rounded-xl border p-3.5 text-right transition-all',
                    formData.warehouse_id === w.id
                      ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500/20 dark:bg-blue-900/20'
                      : 'border-gray-100 bg-white dark:border-slate-700 dark:bg-slate-800'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Database
                      size={18}
                      className={formData.warehouse_id === w.id ? 'text-blue-600' : 'text-gray-400'}
                    />
                    <span className="text-sm font-bold">{w.name_ar || w.name}</span>
                  </div>
                  {formData.warehouse_id === w.id && (
                    <CheckCircle2 size={20} className="text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default StartAuditModal;
