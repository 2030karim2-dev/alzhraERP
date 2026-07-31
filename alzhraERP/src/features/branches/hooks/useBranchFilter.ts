import { useEffect } from 'react';
import { useAuthStore } from '../../auth/store';
import { useBranchFilterStore } from '../store';

/**
 * useBranchFilter
 * 
 * Hook مركزي يُعيد `branch_id` الصحيح للاستخدام في فلترة البيانات.
 * 
 * السلوك:
 * - owner/admin بدون تحديد فرع → يعيد null (يرى جميع الفروع)
 * - owner/admin اختار فرعاً في BranchSwitcher → يعيد branch_id المحدد
 * - موظف مقيد بفرع → يُقيّد تلقائياً بـ branch_id الخاص به
 */
export const useBranchFilter = () => {
  const { user } = useAuthStore();
  const { activeBranchId, activeBranchName, setActiveBranch } = useBranchFilterStore();

  const isManager = user?.role === 'owner' || user?.role === 'admin';
  const userBranchId = user?.branch_id ?? null;

  // إذا كان الموظف مقيداً بفرع، نُعيّن الفرع تلقائياً في المتجر
  useEffect(() => {
    if (!isManager && userBranchId && activeBranchId !== userBranchId) {
      setActiveBranch(userBranchId, user?.branch_name ?? null);
    }
  }, [isManager, userBranchId, activeBranchId, setActiveBranch, user?.branch_name]);

  // المدير العام: يستخدم الفرع المختار في BranchSwitcher أو null (الكل)
  // الموظف: مقيد دائماً بفرعه
  const effectiveBranchId = isManager ? activeBranchId : userBranchId;
  const effectiveBranchName = isManager ? activeBranchName : (user?.branch_name ?? null);

  return {
    /** branch_id المُستخدم للفلترة — null يعني "جميع الفروع" */
    branchId: effectiveBranchId,
    branchName: effectiveBranchName,
    /** هل المستخدم مدير يمكنه تبديل الفرع؟ */
    isManager,
    /** هل يُعرض الكل (لا فلترة بفرع) */
    showingAll: effectiveBranchId === null,
  };
};
