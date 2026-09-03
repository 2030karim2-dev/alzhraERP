import React, { useState, useEffect } from 'react';
import {
  Building2,
  X,
  Clock,
  Ban,
  CheckCircle2,
  Mail,
  Phone,
  Receipt,
  GitBranch,
  Users,
  Calendar,
  Sparkles,
  Save,
} from 'lucide-react';
import type { AdminCompany } from '../../types';
import Button from '../../../../ui/base/Button';
import { useCompanyMutations, useSubscriptionPlans } from '../../hooks/useAdminData';
import { ConfirmModal } from '../../../../ui/base/ConfirmModal';

interface CompanyDetailsModalProps {
  company: AdminCompany | null;
  onClose: () => void;
}

export const CompanyDetailsModal: React.FC<CompanyDetailsModalProps> = ({ company, onClose }) => {
  const { toggleStatus, isToggling, extendTrial, isExtending, assignPlan, isAssigningPlan } =
    useCompanyMutations();
  const { data: subscriptionPlans = [] } = useSubscriptionPlans();

  const [extendDays, setExtendDays] = useState(14);
  const [currentCompany, setCurrentCompany] = useState<AdminCompany | null>(company);
  const [selectedPlanId, setSelectedPlanId] = useState<string>(company?.plan_id || '');
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
    variant: 'danger' | 'warning' | 'primary';
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
    variant: 'primary',
  });

  useEffect(() => {
    setCurrentCompany(company);
    setSelectedPlanId(company?.plan_id || '');
  }, [company]);

  if (!company || !currentCompany) return null;

  const handleToggleClick = () => {
    const nextActive = !currentCompany.is_active;
    const nextStatus = nextActive
      ? currentCompany.subscription_status === 'trial'
        ? 'trial'
        : 'active'
      : 'suspended';
    const actionLabel = nextActive ? 'إعادة تفعيل' : 'تعليق';

    setConfirmModal({
      isOpen: true,
      title: `${actionLabel} منشأة "${currentCompany.name_ar}"`,
      message: nextActive
        ? `هل تريد إعادة تفعيل المنشأة فوراً؟ سيتمكن مستخدموها من تسجيل الدخول واستئناف العمل.`
        : `هل أنت متأكد من تعليق المنشأة؟ سيتم حظر كافة المستخدمين من إجراء أي عمليات بيع أو تقارير فوراً.`,
      variant: nextActive ? 'primary' : 'danger',
      action: async () => {
        await toggleStatus({
          companyId: currentCompany.id,
          isActive: nextActive,
          status: nextStatus,
        });
        setCurrentCompany(prev =>
          prev
            ? {
                ...prev,
                is_active: nextActive,
                subscription_status: nextStatus,
              }
            : null
        );
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  const handleExtend = async () => {
    const result = await extendTrial({
      companyId: currentCompany.id,
      days: extendDays,
    });
    if (result?.trial_ends_at) {
      setCurrentCompany(prev =>
        prev
          ? {
              ...prev,
              trial_ends_at: result.trial_ends_at,
              subscription_status: result.subscription_status,
              is_active: true,
            }
          : null
      );
    }
  };

  const handleSavePlan = async () => {
    const planIdToSave = selectedPlanId ? selectedPlanId : null;
    const success = await assignPlan({
      companyId: currentCompany.id,
      planId: planIdToSave,
    });
    if (success) {
      const matchedPlan = subscriptionPlans.find(p => p.id === selectedPlanId);
      setCurrentCompany(prev =>
        prev
          ? {
              ...prev,
              plan_id: planIdToSave,
              plan_name: matchedPlan ? matchedPlan.name_ar : null,
            }
          : null
      );
    }
  };

  return (
    <div className="backdrop-blur-xs animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 duration-200">
      <div className="animate-in zoom-in-95 w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-600">
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[var(--app-text)]">
                {currentCompany.name_ar}
              </h2>
              <p className="font-mono text-[10px] text-[var(--app-text-secondary)]">
                ID: {currentCompany.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface)]"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 p-5 text-xs">
          {/* Status & Plan Banner */}
          <div className="bg-[var(--app-surface-hover)]/70 flex items-center justify-between rounded-xl border border-[var(--app-border)] p-3">
            <div>
              <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">
                باقة الاشتراك الحالية
              </span>
              <p className="text-sm font-black text-blue-600 dark:text-blue-400">
                {currentCompany.plan_name || 'الباقة الافتراضية'}
              </p>
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">
                حالة المنشأة
              </span>
              <div>
                {currentCompany.is_active ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black text-emerald-600">
                    <CheckCircle2 size={11} />
                    <span>نشطة ({currentCompany.subscription_status})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-[10px] font-black text-rose-600">
                    <Ban size={11} />
                    <span>موقوفة / معلقة</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Plan Assignment Control */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-50/50 p-3 dark:bg-blue-900/10">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-black text-blue-600 dark:text-blue-400">
                <Sparkles size={14} />
                <span>تعيين أو ترقية باقة الاشتراك</span>
              </div>
              {currentCompany.plan_id !== selectedPlanId && (
                <span className="text-[10px] font-bold text-amber-500">تعديلات غير محفوظة</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedPlanId}
                onChange={e => setSelectedPlanId(e.target.value)}
                className="flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1.5 text-xs text-[var(--app-text)] focus:outline-none"
              >
                <option value="">(بدون باقة مخصصة - الخطة الافتراضية)</option>
                {subscriptionPlans.map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name_ar} — {plan.price_monthly} ر.س/شهر ({plan.max_users} مستخدمين)
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                onClick={handleSavePlan}
                disabled={isAssigningPlan || selectedPlanId === (currentCompany.plan_id || '')}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold"
              >
                <Save size={12} />
                <span>{isAssigningPlan ? 'جاري الحفظ...' : 'تحديث الباقة'}</span>
              </Button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-lg border border-[var(--app-border)] p-2.5 text-center">
              <div className="mb-1 flex justify-center text-indigo-500">
                <Users size={14} />
              </div>
              <span className="text-[10px] text-[var(--app-text-secondary)]">المستخدمين</span>
              <p className="text-sm font-black text-[var(--app-text)]">
                {currentCompany.user_count}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--app-border)] p-2.5 text-center">
              <div className="mb-1 flex justify-center text-blue-500">
                <GitBranch size={14} />
              </div>
              <span className="text-[10px] text-[var(--app-text-secondary)]">الفروع</span>
              <p className="text-sm font-black text-[var(--app-text)]">
                {currentCompany.branch_count}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--app-border)] p-2.5 text-center">
              <div className="mb-1 flex justify-center text-emerald-500">
                <Receipt size={14} />
              </div>
              <span className="text-[10px] text-[var(--app-text-secondary)]">الفواتير</span>
              <p className="text-sm font-black text-[var(--app-text)]">
                {currentCompany.invoice_count}
              </p>
            </div>
          </div>

          {/* Details List */}
          <div className="divide-y divide-[var(--app-border)] rounded-xl border border-[var(--app-border)] text-[11px]">
            <div className="flex items-center justify-between p-2.5">
              <span className="flex items-center gap-1.5 text-[var(--app-text-secondary)]">
                <Mail size={13} />
                <span>بريد المالك:</span>
              </span>
              <span className="font-mono font-bold text-[var(--app-text)]">
                {currentCompany.owner_email || 'غير مسجل'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5">
              <span className="flex items-center gap-1.5 text-[var(--app-text-secondary)]">
                <Phone size={13} />
                <span>الهاتف:</span>
              </span>
              <span className="font-bold text-[var(--app-text)]">
                {currentCompany.phone || 'غير مسجل'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5">
              <span className="flex items-center gap-1.5 text-[var(--app-text-secondary)]">
                <Receipt size={13} />
                <span>الرقم الضريبي:</span>
              </span>
              <span className="font-mono font-bold text-[var(--app-text)]">
                {currentCompany.tax_number || 'غير متوفر'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5">
              <span className="flex items-center gap-1.5 text-[var(--app-text-secondary)]">
                <Calendar size={13} />
                <span>تاريخ التسجيل:</span>
              </span>
              <span className="font-bold text-[var(--app-text)]">
                {new Date(currentCompany.created_at).toLocaleDateString('ar-SA')}
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5">
              <span className="flex items-center gap-1.5 text-[var(--app-text-secondary)]">
                <Clock size={13} />
                <span>نهاية الفترة التجريبية:</span>
              </span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {currentCompany.trial_ends_at
                  ? new Date(currentCompany.trial_ends_at).toLocaleDateString('ar-SA')
                  : 'غير محددة'}
              </span>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="bg-[var(--app-surface-hover)]/40 space-y-2.5 rounded-xl border border-[var(--app-border)] p-3">
            <h3 className="text-[11px] font-black text-[var(--app-text)]">
              تمديد الفترة التجريبية (Extend Trial)
            </h3>

            <div className="flex items-center gap-2">
              <select
                value={extendDays}
                onChange={e => setExtendDays(Number(e.target.value))}
                className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1.5 text-xs text-[var(--app-text)] focus:outline-none"
              >
                <option value={7}>+ 7 أيام</option>
                <option value={14}>+ 14 يوماً</option>
                <option value={30}>+ 30 يوماً</option>
                <option value={60}>+ 60 يوماً</option>
              </select>
              <Button
                variant="outline"
                onClick={handleExtend}
                disabled={isExtending}
                className="py-1.5 text-xs font-bold"
              >
                {isExtending ? 'جاري التمديد...' : 'تمديد التجربة'}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--app-border)] bg-[var(--app-surface-hover)] px-5 py-3">
          <Button
            variant={currentCompany.is_active ? 'danger' : 'primary'}
            onClick={handleToggleClick}
            disabled={isToggling}
            className="py-1.5 text-xs font-bold"
          >
            {isToggling
              ? 'جاري التحديث...'
              : currentCompany.is_active
                ? 'تعليق حساب الشركة'
                : 'إعادة تفعيل الشركة'}
          </Button>

          <Button variant="outline" onClick={onClose} className="py-1.5 text-xs font-bold">
            إغلاق
          </Button>
        </div>
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        variant={confirmModal.variant}
        isLoading={isToggling}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.action}
      />
    </div>
  );
};
