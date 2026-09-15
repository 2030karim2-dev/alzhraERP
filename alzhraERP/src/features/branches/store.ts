import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * useBranchFilterStore
 *
 * متجر مركزي لحالة "الفرع النشط" (Active Branch Context).
 * - المدير العام (owner/admin) يمكنه تبديل الفرع عبر BranchSwitcher.
 * - الموظف المقيد بفرع يُحدد من بيانات Auth مباشرة (قراءة فقط — بلا كتابة هنا).
 * - القيمة null تعني "عرض جميع الفروع" (للمديرين فقط).
 *
 * [AUDIT C-1] الفرع النشط مُقيَّد بالشركة (activeCompanyId): أي فرع محفوظ
 * تعود لشركة أخرى يُعتبر قديماً ويُلغى فوراً عبر ensureCompany — يمنع تسريب
 * فلتر الفرع بين الشركات/الجلسات عند تبديل الحساب أو تسجيل الخروج.
 */
interface BranchFilterState {
  activeBranchId: string | null;
  activeBranchName: string | null;
  /** الشركة التي اختير لها الفرع النشط (عزل الفلتر بين الشركات) */
  activeCompanyId: string | null;
  setActiveBranch: (id: string | null, name: string | null, companyId?: string | null) => void;
  resetToAll: () => void;
  /**
   * يضمن أن الفرع النشط يعود للشركة الحالية؛ يُلغيه إن كان قديماً.
   * @returns true إذا بقي فرع نشط صالح بعد الضبط.
   */
  ensureCompany: (companyId: string | null) => boolean;
}

export const useBranchFilterStore = create<BranchFilterState>()(
  persist(
    (set, get) => ({
      activeBranchId: null,
      activeBranchName: null,
      activeCompanyId: null,
      setActiveBranch: (id, name, companyId) =>
        set(state => ({
          activeBranchId: id,
          activeBranchName: id ? name : null,
          activeCompanyId: companyId ?? state.activeCompanyId,
        })),
      resetToAll: () => set({ activeBranchId: null, activeBranchName: null }),
      ensureCompany: companyId => {
        const { activeCompanyId, activeBranchId } = get();
        if (activeCompanyId === companyId) return activeBranchId !== null;
        set({ activeBranchId: null, activeBranchName: null, activeCompanyId: companyId });
        return false;
      },
    }),
    {
      name: 'alzhra-active-branch',
      partialize: state => ({
        activeBranchId: state.activeBranchId,
        activeBranchName: state.activeBranchName,
        activeCompanyId: state.activeCompanyId,
      }),
    }
  )
);
