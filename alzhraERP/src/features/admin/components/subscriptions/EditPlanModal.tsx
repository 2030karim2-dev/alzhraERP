import React, { useState } from 'react';
import { X, Sparkles, Plus } from 'lucide-react';
import type { SubscriptionPlan } from '../../types';
import Button from '../../../../ui/base/Button';
import { usePlanMutations } from '../../hooks/useAdminData';

interface EditPlanModalProps {
  plan: SubscriptionPlan | null;
  onClose: () => void;
}

export const EditPlanModal: React.FC<EditPlanModalProps> = ({ plan, onClose }) => {
  const { savePlan, isSaving } = usePlanMutations();

  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    ...(plan?.id ? { id: plan.id } : {}),
    name_ar: plan?.name_ar || '',
    name_en: plan?.name_en || '',
    price_monthly: plan?.price_monthly || 0,
    price_yearly: plan?.price_yearly || 0,
    max_users: plan?.max_users || 5,
    max_products: plan?.max_products || 1000,
    max_invoices_monthly: plan?.max_invoices_monthly || 500,
    ai_tokens_monthly: plan?.ai_tokens_monthly || 100000,
    features: plan?.features || [
      'نظام المبيعات ونقاط البيع',
      'إدارة المخزون والباركود',
      'سندات القبض والصرف',
    ],
    is_active: plan?.is_active ?? true,
    color: plan?.color || '#3B82F6',
    sort_order: plan?.sort_order || 0,
  });

  const [newFeature, setNewFeature] = useState('');

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    setFormData(prev => ({
      ...prev,
      features: [...(prev.features || []), newFeature.trim()],
    }));
    setNewFeature('');
  };

  const handleRemoveFeature = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      features: (prev.features || []).filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name_ar) return;
    await savePlan(formData);
    onClose();
  };

  return (
    <div className="backdrop-blur-xs animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 duration-200">
      <div className="animate-in zoom-in-95 w-full max-w-lg overflow-hidden rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl duration-200">
        <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface-hover)] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-500" />
            <h2 className="text-xs font-black text-[var(--app-text)]">
              {plan?.id ? 'تعديل باقة اشتراك' : 'إضافة باقة اشتراك جديدة'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)]"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 p-5 text-xs">
          {/* Names */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-[var(--app-text)]">
                اسم الباقة (عربي) *
              </label>
              <input
                type="text"
                required
                value={formData.name_ar}
                onChange={e => setFormData({ ...formData, name_ar: e.target.value })}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 text-xs text-[var(--app-text)] focus:outline-none"
                placeholder="مثال: الباقة المتقدمة"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-[var(--app-text)]">
                اسم الباقة (English)
              </label>
              <input
                type="text"
                value={formData.name_en || ''}
                onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 text-xs text-[var(--app-text)] focus:outline-none"
                placeholder="e.g. Advanced Plan"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-[var(--app-text)]">
                السعر الشهري (ر.س)
              </label>
              <input
                type="number"
                min="0"
                value={formData.price_monthly}
                onChange={e => setFormData({ ...formData, price_monthly: Number(e.target.value) })}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 font-mono text-xs text-[var(--app-text)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold text-[var(--app-text)]">
                السعر السنوي (ر.س)
              </label>
              <input
                type="number"
                min="0"
                value={formData.price_yearly}
                onChange={e => setFormData({ ...formData, price_yearly: Number(e.target.value) })}
                className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 font-mono text-xs text-[var(--app-text)] focus:outline-none"
              />
            </div>
          </div>

          {/* Limits & Quotas */}
          <div className="bg-[var(--app-surface-hover)]/40 space-y-2.5 rounded-xl border border-[var(--app-border)] p-3">
            <span className="text-[10px] font-black uppercase text-[var(--app-text-secondary)]">
              حدود وحصص الاستهلاك (Quotas)
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-[var(--app-text)]">
                  الحد الأقصى للمستخدمين
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.max_users}
                  onChange={e => setFormData({ ...formData, max_users: Number(e.target.value) })}
                  className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1 font-mono text-xs text-[var(--app-text)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-[var(--app-text)]">
                  الحد الأقصى للفواتير شهرياً
                </label>
                <input
                  type="number"
                  min="50"
                  value={formData.max_invoices_monthly}
                  onChange={e =>
                    setFormData({ ...formData, max_invoices_monthly: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1 font-mono text-xs text-[var(--app-text)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-[var(--app-text)]">
                  الحد الأقصى للمنتجات
                </label>
                <input
                  type="number"
                  min="100"
                  value={formData.max_products}
                  onChange={e => setFormData({ ...formData, max_products: Number(e.target.value) })}
                  className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1 font-mono text-xs text-[var(--app-text)]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-[var(--app-text)]">
                  رصيد توكنز الذكاء الاصطناعي
                </label>
                <input
                  type="number"
                  min="0"
                  step="10000"
                  value={formData.ai_tokens_monthly}
                  onChange={e =>
                    setFormData({ ...formData, ai_tokens_monthly: Number(e.target.value) })
                  }
                  className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1 font-mono text-xs text-[var(--app-text)]"
                />
              </div>
            </div>
          </div>

          {/* Features List */}
          <div>
            <label className="mb-1 block text-[11px] font-bold text-[var(--app-text)]">
              الميزات المتضمنة بالباقة
            </label>
            <div className="mb-2 flex gap-1.5">
              <input
                type="text"
                placeholder="أضف ميزة جديدة..."
                value={newFeature}
                onChange={e => setNewFeature(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddFeature();
                  }
                }}
                className="flex-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 text-xs text-[var(--app-text)] focus:outline-none"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddFeature}
                className="px-2.5 py-1 text-xs"
              >
                <Plus size={14} />
              </Button>
            </div>
            <div className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto p-1">
              {(formData.features || []).map((feat, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--app-border)] bg-[var(--app-surface-hover)] px-2 py-0.5 text-[10px] text-[var(--app-text)]"
                >
                  <span>{feat}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(idx)}
                    className="text-rose-500 hover:text-rose-700"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Active Status & Color */}
          <div className="flex items-center justify-between border-t border-[var(--app-border)] pt-2">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-[var(--app-border)] text-blue-600 focus:ring-0"
              />
              <span className="text-xs font-bold text-[var(--app-text)]">
                الباقة مفعلة ومتاحة للاختيار
              </span>
            </label>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--app-text-secondary)]">لون التمييز:</span>
              <input
                type="color"
                value={formData.color || '#3B82F6'}
                onChange={e => setFormData({ ...formData, color: e.target.value })}
                className="h-6 w-6 cursor-pointer rounded border-0"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 border-t border-[var(--app-border)] pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="px-3 py-1.5 text-xs"
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-bold"
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ الباقة'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
