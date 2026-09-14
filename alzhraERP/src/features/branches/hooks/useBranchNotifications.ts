import { useEffect } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { useBranchFilterStore } from '@/features/branches/store';
import { useFeedbackStore } from '@/features/feedback/store';
import { subscribeToBranchNotifications } from '../api';

export const useBranchNotifications = () => {
  const { user } = useAuthStore();
  const { activeBranchId } = useBranchFilterStore();
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
