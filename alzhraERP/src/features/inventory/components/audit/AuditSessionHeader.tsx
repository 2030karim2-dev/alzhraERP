import React from 'react';
import { ClipboardCheck, Save, CheckCircle, Loader2, PackageSearch, Plus } from 'lucide-react';
import MicroHeader from '../../../../ui/base/MicroHeader';
import Button from '../../../../ui/base/Button';

interface AuditSessionHeaderProps {
  title: string;
  isCompleted: boolean;
  isRestoring: boolean;
  saveStatus: string;
  canManageAudit: boolean;
  isSavingProgress: boolean;
  isFinalizing: boolean;
  isPopulatingWarehouse: boolean;
  onOpenAddProduct: () => void;
  onOpenBulkConfirm: () => void;
  onSave: () => void;
  onFinalize: () => void;
}

export const AuditSessionHeader: React.FC<AuditSessionHeaderProps> = ({
  title,
  isCompleted,
  isRestoring,
  saveStatus,
  canManageAudit,
  isSavingProgress,
  isFinalizing,
  isPopulatingWarehouse,
  onOpenAddProduct,
  onOpenBulkConfirm,
  onSave,
  onFinalize,
}) => {
  return (
    <MicroHeader
      title={title || 'جلسة جرد'}
      icon={ClipboardCheck}
      actions={
        <div className="flex items-center gap-1 sm:gap-2">
          {isRestoring && (
            <span className="ml-2 hidden animate-pulse self-center text-[10px] text-blue-500 md:inline">
              استعادة...
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="ml-2 hidden self-center text-[10px] text-amber-500 md:inline">
              حفظ...
            </span>
          )}

          {!isCompleted && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAddProduct}
              leftIcon={<Plus size={14} className="text-emerald-600" />}
              title="إضافة منتج جديد دون مغادرة الجلسة"
              className="border-emerald-300 bg-emerald-50 px-2.5 font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 sm:px-3"
            >
              <span>منتج جديد</span>
            </Button>
          )}

          {!isCompleted && canManageAudit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenBulkConfirm}
              isLoading={isPopulatingWarehouse}
              leftIcon={
                isPopulatingWarehouse ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <PackageSearch size={12} />
                )
              }
              title="جرد كامل للمستودع"
              className="px-2 sm:px-3"
            >
              <span className="hidden sm:inline">جرد كامل</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            isLoading={isSavingProgress}
            leftIcon={<Save size={12} />}
            title="حفظ مسودة"
            className="px-2 sm:px-3"
          >
            <span className="hidden sm:inline">حفظ</span>
          </Button>
          <Button
            variant="success"
            size="sm"
            onClick={onFinalize}
            isLoading={isFinalizing}
            disabled={isCompleted || !canManageAudit}
            leftIcon={<CheckCircle size={12} />}
            className="border-none bg-emerald-600 px-2 hover:bg-emerald-700 sm:px-3"
            title={canManageAudit ? 'إنهاء وترحيل' : 'يتطلب صلاحية مدير/مالك'}
          >
            <span className="hidden sm:inline">{isCompleted ? 'تم الإغلاق' : 'إنهاء وترحيل'}</span>
          </Button>
        </div>
      }
    />
  );
};
