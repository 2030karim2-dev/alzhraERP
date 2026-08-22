import React, { useEffect, useState } from 'react';
import { X, GitBranch, Loader2, Phone, MapPin } from 'lucide-react';
import { Branch, BranchFormData } from '../../types';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 max-md:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--app-border)] bg-[var(--app-surface)]">
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
            className="p-1.5 text-[var(--app-text-secondary)] hover:text-[var(--app-text)] hover:bg-[var(--app-surface-hover)] rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 max-md:p-4 space-y-4">
          {/* Branch Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
              اسم الفرع <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white dark:bg-slate-800 dark:text-white transition-all"
              required
              autoFocus
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
              <MapPin size={13} className="inline ml-1 text-gray-400" />
              العنوان
            </label>
            <input
              type="text"
              value={form.address ?? ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white dark:bg-slate-800 dark:text-white transition-all"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
              <Phone size={13} className="inline ml-1 text-gray-400" />
              رقم الهاتف
            </label>
            <input
              type="tel"
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white dark:bg-slate-800 dark:text-white transition-all"
              dir="ltr"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
              الحالة
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm bg-white dark:bg-slate-800 dark:text-white transition-all"
            >
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading || !form.name.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center justify-center gap-2 shadow-xs"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                isEditMode ? 'حفظ التغييرات' : 'إضافة الفرع'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BranchFormModal;
