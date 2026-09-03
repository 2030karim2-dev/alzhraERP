import React, { useState } from 'react';
import { Plus, Check, Edit3, Trash2, Users, Receipt, Package, Bot, RefreshCw } from 'lucide-react';
import type { SubscriptionPlan } from '../../types';
import { useSubscriptionPlans, usePlanMutations } from '../../hooks/useAdminData';
import { EditPlanModal } from './EditPlanModal';
import Button from '../../../../ui/base/Button';
import { ConfirmModal } from '../../../../ui/base/ConfirmModal';

export const PlansManager: React.FC = () => {
  const { data: plans = [], isLoading, isError, refetch } = useSubscriptionPlans();
  const { deletePlan, isDeleting } = usePlanMutations();
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<SubscriptionPlan | null>(null);

  const handleConfirmDelete = async () => {
    if (!planToDelete?.id) return;
    try {
      await deletePlan(planToDelete.id);
    } finally {
      setPlanToDelete(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-xs">
        <div>
          <h2 className="text-xs font-black text-[var(--app-text)]">
            باقات وخطط الاشتراك في المنصة
          </h2>
          <p className="text-[10px] text-[var(--app-text-secondary)]">
            تحكم في أسعار الباقات، حدود المستخدمين، الحصص الشهرية، وميزات كل خطة.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="px-2.5 py-1.5 text-xs"
            title="تحديث"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button
            variant="primary"
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold"
          >
            <Plus size={14} />
            <span>إضافة باقة جديدة</span>
          </Button>
        </div>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-[var(--app-surface-hover)]" />
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-8 text-center text-xs font-bold text-rose-600">
          تعذر تحميل باقات الاشتراك. يرجى التحقق من الاتصال ثم إعادة المحاولة.
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 text-center text-xs text-[var(--app-text-secondary)]">
          لا توجد خطط اشتراك مسجلة حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
          {plans.map(plan => (
            <div
              key={plan.id}
              className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xs transition-shadow hover:shadow-md"
            >
              {/* Top Accent Bar */}
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: plan.color || '#3B82F6' }}
              />

              <div>
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-md px-2 py-0.5 text-[10px] font-black text-white"
                    style={{ backgroundColor: plan.color || '#3B82F6' }}
                  >
                    {plan.name_ar}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingPlan(plan)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface-hover)] hover:text-blue-600"
                      title="تعديل الباقة"
                    >
                      <Edit3 size={13} />
                    </button>
                    <button
                      onClick={() => setPlanToDelete(plan)}
                      disabled={isDeleting}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--app-border)] text-[var(--app-text-secondary)] transition-colors hover:bg-rose-500/10 hover:text-rose-600 disabled:opacity-50"
                      title="حذف الباقة"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Price */}
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-mono text-2xl font-black text-[var(--app-text)]">
                    {plan.price_monthly}
                  </span>
                  <span className="text-[10px] font-bold text-[var(--app-text-secondary)]">
                    ر.س / شهرياً
                  </span>
                  <span className="ms-auto font-mono text-[10px] text-[var(--app-text-secondary)]">
                    ({plan.price_yearly} سنوي)
                  </span>
                </div>

                {/* Quotas */}
                <div className="bg-[var(--app-surface-hover)]/60 mt-3.5 grid grid-cols-2 gap-2 rounded-xl p-2.5 text-[10px]">
                  <div className="flex items-center gap-1.5 text-[var(--app-text)]">
                    <Users size={12} className="text-indigo-500" />
                    <span>
                      مستخدمين: <strong>{plan.max_users}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[var(--app-text)]">
                    <Receipt size={12} className="text-emerald-500" />
                    <span>
                      فواتير: <strong>{plan.max_invoices_monthly}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[var(--app-text)]">
                    <Package size={12} className="text-blue-500" />
                    <span>
                      أصناف: <strong>{plan.max_products}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[var(--app-text)]">
                    <Bot size={12} className="text-purple-500" />
                    <span>
                      AI Tokens: <strong>{plan.ai_tokens_monthly}</strong>
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div className="mt-3 space-y-1.5">
                  <span className="text-[10px] font-black uppercase text-[var(--app-text-secondary)]">
                    الميزات المتضمنة:
                  </span>
                  <ul className="space-y-1 text-xs">
                    {(plan.features || []).map((feat, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-1.5 text-[11px] text-[var(--app-text)]"
                      >
                        <Check size={12} className="flex-shrink-0 text-emerald-500" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Status */}
              <div className="mt-4 flex items-center justify-between border-t border-[var(--app-border)] pt-3 text-[10px]">
                <span
                  className={
                    plan.is_active ? 'font-bold text-emerald-600' : 'font-bold text-rose-500'
                  }
                >
                  {plan.is_active ? '● الباقة مفعلة' : '○ الباقة مخفية'}
                </span>
                <span className="text-[var(--app-text-secondary)]">الترتيب: {plan.sort_order}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      {(editingPlan || isCreating) && (
        <EditPlanModal
          plan={editingPlan}
          existingNames={plans
            .filter(p => p.id !== editingPlan?.id)
            .map(p => p.name_ar)
            .filter(name => name.trim() !== '')}
          onClose={() => {
            setEditingPlan(null);
            setIsCreating(false);
          }}
        />
      )}

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!planToDelete}
        title={`حذف باقة "${planToDelete?.name_ar || ''}"`}
        message="هل أنت متأكد من حذف باقة الاشتراك هذه نهائياً؟ في حال كانت الباقة مرتبطة بمنشآت سيرفض النظام الحذف حمايةً لبياناتها — ألغِ ربطها أولاً ثم أعد المحاولة."
        variant="danger"
        confirmLabel="حذف نهائي"
        isLoading={isDeleting}
        onClose={() => setPlanToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
