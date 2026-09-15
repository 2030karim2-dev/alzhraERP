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
 *
 * [AUDIT C-1/M-6] لا كتابة في المتجر المُPersist من هذا الـhook:
 * - فرع الموظف يُقرأ من بيانات المصادقة مباشرة في كل استدعاء.
 * - الفرع المحفوظ للمدير يُهمل فوراً إذا كان يعود لشركة أخرى (قيمة قديمة)،
 *   ويُعاد ضبط المتجر عبر ensureCompany.
 */
export const useBranchFilter = () => {
  const { user } = useAuthStore();
  const activeBranchId = useBranchFilterStore(s => s.activeBranchId);
  const activeBranchName = useBranchFilterStore(s => s.activeBranchName);
  const activeCompanyId = useBranchFilterStore(s => s.activeCompanyId);
  const ensureCompany = useBranchFilterStore(s => s.ensureCompany);

  const isManager = user?.role === 'owner' || user?.role === 'admin';
  const userBranchId = user?.branch_id ?? null;
  const userCompanyId = user?.company_id ?? null;

  // فرع محفوظ من شركة أخرى = قديم ويُهمل فوراً (بدون وميض بيانات خاطئة)
  const isStaleStore = activeCompanyId !== null && activeCompanyId !== userCompanyId;
  const managerBranchId = isStaleStore ? null : activeBranchId;
  const managerBranchName = isStaleStore ? null : activeBranchName;

  // تهيئة الشركة الحالية / إعادة الضبط عند تبديل الشركة أو تسجيل الخروج
  useEffect(() => {
    ensureCompany(userCompanyId);
  }, [ensureCompany, userCompanyId]);

  // المدير العام: يستخدم الفرع المختار في BranchSwitcher أو null (الكل)
  // الموظف: مقيد دائماً بفرعه
  const effectiveBranchId = isManager ? managerBranchId : userBranchId;
  const effectiveBranchName = isManager ? managerBranchName : (user?.branch_name ?? null);

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
