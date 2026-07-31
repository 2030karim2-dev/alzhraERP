import React, { useState } from 'react';
import {
  GitBranch, Plus, Pencil, Trash2, Loader2,
  Phone, MapPin, CheckCircle2, XCircle, Building2
} from 'lucide-react';
import { useBranches, useBranchMutations } from '../../hooks';
import { Branch, BranchFormData } from '../../types';
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
    if (window.confirm(`هل أنت متأكد من حذف فرع "${branch.name}"؟\nلا يمكن التراجع عن هذا الإجراء.`)) {
      deleteBranch(branch.id);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-3">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-slate-800 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <GitBranch size={22} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white text-base">فروع الشركة</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">إدارة الفروع والمواقع الجغرافية للشركة</p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-indigo-200 dark:shadow-none"
          >
            <Plus size={16} />
            إضافة فرع
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
              <span className="text-sm">جاري تحميل الفروع...</span>
            </div>
          ) : !branches || branches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-full mb-4">
                <Building2 size={40} className="text-indigo-300 dark:text-indigo-600" />
              </div>
              <p className="text-gray-600 dark:text-slate-300 font-semibold mb-1">لا توجد فروع بعد</p>
              <p className="text-gray-400 dark:text-slate-500 text-sm mb-5">ابدأ بإضافة فروع شركتك لإدارتها بكفاءة</p>
              <button
                onClick={openAddModal}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all"
              >
                <Plus size={16} />
                إضافة أول فرع
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{branches.length}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">إجمالي الفروع</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {branches.filter((b: Branch) => b.status === 'active').length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">فروع نشطة</p>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 rounded-xl p-4 text-center hidden md:block">
                  <p className="text-2xl font-bold text-gray-500 dark:text-slate-400">
                    {branches.filter((b: Branch) => b.status !== 'active').length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">فروع معطلة</p>
                </div>
              </div>

              {/* Branch Cards */}
              {branches.map((branch: Branch) => (
                <div
                  key={branch.id}
                  className="group flex items-start justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-all duration-200"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {/* Icon */}
                    <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                      branch.status === 'active'
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-400'
                    }`}>
                      <GitBranch size={18} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800 dark:text-white">{branch.name}</p>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          branch.status === 'active'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                        }`}>
                          {branch.status === 'active'
                            ? <><CheckCircle2 size={11} /> نشط</>
                            : <><XCircle size={11} /> غير نشط</>
                          }
                        </span>
                      </div>

                      <div className="mt-1 flex flex-col gap-0.5">
                        {branch.address && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1">
                            <MapPin size={11} className="shrink-0" />
                            <span className="truncate">{branch.address}</span>
                          </p>
                        )}
                        {branch.phone && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 flex items-center gap-1" dir="ltr">
                            <Phone size={11} className="shrink-0" />
                            {branch.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => openEditModal(branch)}
                      className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                      title="تعديل"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(branch)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
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
