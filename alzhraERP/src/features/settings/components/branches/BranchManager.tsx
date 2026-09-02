import React, { useState } from 'react';
import {
  GitBranch,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Phone,
  MapPin,
  CheckCircle2,
  XCircle,
  Building2,
} from 'lucide-react';
import { useBranches, useBranchMutations } from '../../hooks';
import type { Branch, BranchFormData } from '../../types';
import BranchFormModal from './BranchFormModal';

const BranchManager: React.FC = () => {
  const { data: branches, isLoading } = useBranches();
  const { addBranch, editBranch, deleteBranch, isAdding, isEditing } = useBranchMutations();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

  const openAddModal = () => {
    setSelectedBranch(null);
    setModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setSelectedBranch(branch);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelectedBranch(null);
  };

  const handleSubmit = (data: BranchFormData) => {
    if (selectedBranch) {
      editBranch({ id: selectedBranch.id, data }, { onSuccess: closeModal });
    } else {
      addBranch(data, { onSuccess: closeModal });
    }
  };

  const handleDelete = (branch: Branch) => {
    if (
      window.confirm(`هل أنت متأكد من حذف فرع "${branch.name}"؟\nلا يمكن التراجع عن هذا الإجراء.`)
    ) {
      deleteBranch(branch.id);
    }
  };

  return (
    <>
      <div className="animate-in fade-in slide-in-from-bottom-3 overflow-hidden rounded-2xl border border-gray-200 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-800/20">
          <div className="flex items-center gap-3">
            <GitBranch size={22} className="text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-white">فروع الشركة</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                إدارة الفروع والمواقع الجغرافية للشركة
              </p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-xs transition-colors duration-150 hover:bg-blue-700"
          >
            <Plus size={16} />
            إضافة فرع
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <span className="text-sm">جاري تحميل الفروع...</span>
            </div>
          ) : !branches || branches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-4 rounded-full bg-indigo-50 p-5 dark:bg-indigo-900/20">
                <Building2 size={40} className="text-indigo-300 dark:text-indigo-600" />
              </div>
              <p className="mb-1 font-semibold text-gray-600 dark:text-slate-300">
                لا توجد فروع بعد
              </p>
              <p className="mb-5 text-sm text-gray-400 dark:text-slate-500">
                ابدأ بإضافة فروع شركتك لإدارتها بكفاءة
              </p>
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-indigo-700"
              >
                <Plus size={16} />
                إضافة أول فرع
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {/* Stats row */}
              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="rounded-xl bg-indigo-50 p-4 text-center dark:bg-indigo-900/20">
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                    {branches.length}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">إجمالي الفروع</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-4 text-center dark:bg-emerald-900/20">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {branches.filter((b: Branch) => b.status === 'active').length}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">فروع نشطة</p>
                </div>
                <div className="hidden rounded-xl bg-gray-50 p-4 text-center dark:bg-slate-800 md:block">
                  <p className="text-2xl font-bold text-gray-500 dark:text-slate-400">
                    {branches.filter((b: Branch) => b.status !== 'active').length}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">فروع معطلة</p>
                </div>
              </div>

              {/* Branch Cards */}
              {branches.map((branch: Branch) => (
                <div
                  key={branch.id}
                  className="group flex items-start justify-between rounded-xl border border-gray-100 bg-gray-50 p-4 transition-all duration-200 hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-indigo-700 dark:hover:bg-indigo-900/10"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`mt-0.5 shrink-0 rounded-xl p-2 ${
                        branch.status === 'active'
                          ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400'
                          : 'bg-gray-100 text-gray-400 dark:bg-slate-700'
                      }`}
                    >
                      <GitBranch size={18} />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-gray-800 dark:text-white">{branch.name}</p>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            branch.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400'
                          }`}
                        >
                          {branch.status === 'active' ? (
                            <>
                              <CheckCircle2 size={11} /> نشط
                            </>
                          ) : (
                            <>
                              <XCircle size={11} /> غير نشط
                            </>
                          )}
                        </span>
                      </div>

                      <div className="mt-1 flex flex-col gap-0.5">
                        {branch.address && (
                          <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400">
                            <MapPin size={11} className="shrink-0" />
                            <span className="truncate">{branch.address}</span>
                          </p>
                        )}
                        {branch.phone && (
                          <p
                            className="flex items-center gap-1 text-xs text-gray-500 dark:text-slate-400"
                            dir="ltr"
                          >
                            <Phone size={11} className="shrink-0" />
                            {branch.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100">
                    <button
                      onClick={() => {
                        openEditModal(branch);
                      }}
                      className="rounded-lg p-2 text-gray-400 transition-all hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400"
                      title="تعديل"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => {
                        handleDelete(branch);
                      }}
                      className="rounded-lg p-2 text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      <BranchFormModal
        isOpen={modalOpen}
        onClose={closeModal}
        onSubmit={handleSubmit}
        isLoading={selectedBranch ? isEditing : isAdding}
        branch={selectedBranch}
      />
    </>
  );
};

export default BranchManager;
