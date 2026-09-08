import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import Modal from '../../../../ui/base/Modal';
import Button from '../../../../ui/base/Button';
import { formatLocalDate } from '../../../../core/utils/dateUtils';
import type { CreateFixedAssetInput } from '../../services/fixedAssetService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateFixedAssetInput) => Promise<void>;
  isLoading: boolean;
}

const AddAssetModal: React.FC<Props> = ({ isOpen, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState<CreateFixedAssetInput>({
    name: '',
    asset_code: '',
    category: 'equipment',
    purchase_date: formatLocalDate(new Date()),
    purchase_cost: 0,
    salvage_value: 0,
    useful_life_months: 60,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.asset_code || formData.purchase_cost <= 0) return;

    await onSubmit(formData);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تسجيل أصل ثابت جديد" size="md">
      <form onSubmit={handleSubmit} className="space-y-4 p-1">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
              اسم الأصل <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="مثال: رافعة سيارات هيدروليكية"
              className="w-full rounded-lg border border-slate-300 bg-[var(--app-surface)] px-3 py-2 text-xs text-[var(--app-text)] focus:border-blue-500 focus:outline-none dark:border-slate-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
              كود الأصل <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.asset_code}
              onChange={e => setFormData(prev => ({ ...prev, asset_code: e.target.value }))}
              placeholder="مثال: AST-001"
              className="w-full rounded-lg border border-slate-300 bg-[var(--app-surface)] px-3 py-2 font-mono text-xs text-[var(--app-text)] focus:border-blue-500 focus:outline-none dark:border-slate-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
              تصنيف الأصل
            </label>
            <select
              value={formData.category}
              onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-[var(--app-surface)] px-3 py-2 text-xs text-[var(--app-text)] focus:border-blue-500 focus:outline-none dark:border-slate-700"
            >
              <option value="equipment">معدات وآلات</option>
              <option value="vehicles">مركبات وسيارات</option>
              <option value="furniture">أثاث وتجهيزات</option>
              <option value="computers">أجهزة كمبيوتر وتقنية</option>
              <option value="buildings">عقارات ومباني</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
              تاريخ الشراء
            </label>
            <input
              type="date"
              required
              value={formData.purchase_date}
              onChange={e => setFormData(prev => ({ ...prev, purchase_date: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 bg-[var(--app-surface)] px-3 py-2 font-mono text-xs text-[var(--app-text)] focus:border-blue-500 focus:outline-none dark:border-slate-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
              تكلفة الشراء (ر.س) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={formData.purchase_cost || ''}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  purchase_cost: Number.parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 bg-[var(--app-surface)] px-3 py-2 font-mono text-xs text-[var(--app-text)] focus:border-blue-500 focus:outline-none dark:border-slate-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
              قيمة الخردة المتبقية (ر.س)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.salvage_value || ''}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  salvage_value: Number.parseFloat(e.target.value) || 0,
                }))
              }
              placeholder="0.00"
              className="w-full rounded-lg border border-slate-300 bg-[var(--app-surface)] px-3 py-2 font-mono text-xs text-[var(--app-text)] focus:border-blue-500 focus:outline-none dark:border-slate-700"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">
              العمر الإنتاجي (أشهر) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              required
              value={formData.useful_life_months || ''}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  useful_life_months: Number.parseInt(e.target.value, 10) || 1,
                }))
              }
              placeholder="60"
              className="w-full rounded-lg border border-slate-300 bg-[var(--app-surface)] px-3 py-2 font-mono text-xs text-[var(--app-text)] focus:border-blue-500 focus:outline-none dark:border-slate-700"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-[var(--app-text)]">ملاحظات</label>
          <textarea
            rows={2}
            value={formData.notes || ''}
            onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="بيانات الضمان، الرقم التسلسلي، موقع الأصل..."
            className="w-full rounded-lg border border-slate-300 bg-[var(--app-surface)] px-3 py-2 text-xs text-[var(--app-text)] focus:border-blue-500 focus:outline-none dark:border-slate-700"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose} disabled={isLoading}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={
              !formData.name || !formData.asset_code || formData.purchase_cost <= 0 || isLoading
            }
            isLoading={isLoading}
            leftIcon={<Building2 size={14} />}
          >
            حفظ الأصل
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddAssetModal;
