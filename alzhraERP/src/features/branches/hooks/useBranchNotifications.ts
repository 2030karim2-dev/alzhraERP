import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { useBranchFilter } from './useBranchFilter';
import { useFeedbackStore } from '@/features/feedback/store';
import { subscribeToBranchNotifications } from '../api';

export const useBranchNotifications = () => {
  const { user } = useAuthStore();
  // [AUDIT M-6] القراءة عبر useBranchFilter: تعمل للموظف المقيد بفرع من بيانات
  // المصادقة مباشرة، وللمدير من الفرع النشط — دون كتابة في المتجر المُPersist.
  const { branchId: activeBranchId } = useBranchFilter();
  const { showToast } = useFeedbackStore();

  useEffect(() => {
    if (!user?.company_id || !activeBranchId) return;

    const unsubscribe = subscribeToBranchNotifications(user.company_id, notification => {
      // Show popup only if the notification targets the user's currently active branch
      if (notification.target_branch_id === activeBranchId) {
        showToast(`تنبيه مبيعات داخلية 🔄\n${notification.message}`, 'info');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [user?.company_id, activeBranchId, showToast]);
};
