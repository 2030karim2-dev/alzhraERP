import React, { useEffect, useState } from 'react';
import { X, GitBranch, Loader2, Phone, MapPin } from 'lucide-react';
import type { Branch, BranchFormData } from '../../types';

interface BranchFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BranchFormData) => void;
  isLoading?: boolean;
  branch?: Branch | null;
}

const BranchFormModal: React.FC<BranchFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
  branch = null,
}) => {
  const isEditMode = !!branch;

  const [form, setForm] = useState<BranchFormData>({
    name: '',
    address: '',
    phone: '',
    status: 'active',
  });

  useEffect(() => {
    if (branch) {
      setForm({
        name: branch.name,
        address: branch.address ?? '',
        phone: branch.phone ?? '',
        status: branch.status,
      });
    } else {
      setForm({ name: '', address: '', phone: '', status: 'active' });
    }
  }, [branch, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  if (!isOpen) return null;

  return (
    <div
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm duration-200 max-md:p-4"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-in zoom-in-95 w-full max-w-md overflow-hidden rounded-2xl bg-[var(--app-surface)] shadow-2xl duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--app-border)] bg-[var(--app-surface)] p-5">
          <div className="flex items-center gap-3">
            <GitBranch size={20} className="text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-base font-bold text-[var(--app-text)]">
                {isEditMode ? 'تعديل الفرع' : 'إضافة فرع جديد'}
              </h2>
              <p className="text-xs text-[var(--app-text-secondary)]">
                {isEditMode ? 'قم بتحديث بيانات الفرع' : 'أدخل بيانات الفرع الجديد'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--app-text-secondary)] transition-colors hover:bg-[var(--app-surface-hover)] hover:text-[var(--app-text)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 p-6 max-md:p-4">
          {/* Branch Name */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">
              اسم الفرع <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => {
                setForm({ ...form, name: e.target.value });
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              required
              autoFocus
            />
          </div>

          {/* Address */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">
              <MapPin size={13} className="ml-1 inline text-gray-400" />
              العنوان
            </label>
            <input
              type="text"
              value={form.address ?? ''}
              onChange={e => {
                setForm({ ...form, address: e.target.value });
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">
              <Phone size={13} className="ml-1 inline text-gray-400" />
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={form.phone ?? ''}
              onChange={e => {
                setForm({ ...form, phone: e.target.value });
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              dir="ltr"
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700 dark:text-slate-300">
              الحالة
            </label>
            <select
              value={form.status}
              onChange={e => {
                setForm({ ...form, status: e.target.value });
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 border-t pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading || !form.name.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  جاري الحفظ...
                </>
              ) : isEditMode ? (
                'حفظ التغييرات'
              ) : (
                'إضافة الفرع'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchFormModal;
