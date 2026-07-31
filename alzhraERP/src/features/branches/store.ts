import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * useBranchFilterStore
 * 
 * متجر مركزي لحالة "الفرع النشط" (Active Branch Context).
 * - المدير العام (owner/admin) يمكنه تبديل الفرع عبر BranchSwitcher.
 * - الموظف المقيد بفرع يُحدد تلقائياً من بيانات Auth.
 * - القيمة null تعني "عرض جميع الفروع" (للمديرين فقط).
 */
interface BranchFilterState {
  activeBranchId: string | null;
  activeBranchName: string | null;
  setActiveBranch: (id: string | null, name: string | null) => void;
  resetToAll: () => void;
}

export const useBranchFilterStore = create<BranchFilterState>()(
  persist(
    (set) => ({
      activeBranchId: null,
      activeBranchName: null,
      setActiveBranch: (id, name) => set({ activeBranchId: id, activeBranchName: name }),
      resetToAll: () => set({ activeBranchId: null, activeBranchName: null }),
    }),
    {
      name: 'alzhra-active-branch',
      partialize: (state) => ({
        activeBranchId: state.activeBranchId,
        activeBranchName: state.activeBranchName,
      }),
    }
  )
);
