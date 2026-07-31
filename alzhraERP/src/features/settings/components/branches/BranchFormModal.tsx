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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b dark:border-slate-800 bg-gradient-to-r from-indigo-600 to-blue-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <GitBranch size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditMode ? 'تعديل الفرع' : 'إضافة فرع جديد'}
              </h2>
              <p className="text-xs text-white/70">
                {isEditMode ? 'قم بتحديث بيانات الفرع' : 'أدخل بيانات الفرع الجديد'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Branch Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1.5">
              اسم الفرع <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="مثال: الفرع الرئيسي، فرع الرياض"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-white dark:bg-slate-800 dark:text-white transition-all"
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
              placeholder="مثال: الرياض، حي العليا، شارع التحلية"
              value={form.address ?? ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-white dark:bg-slate-800 dark:text-white transition-all"
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
              placeholder="مثال: 0501234567"
              value={form.phone ?? ''}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-white dark:bg-slate-800 dark:text-white transition-all"
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
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm bg-white dark:bg-slate-800 dark:text-white transition-all"
            >
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all text-sm font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isLoading || !form.name.trim()}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-200 dark:shadow-none"
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
