import { supabase } from '@/lib/supabaseClient';
import { logger } from '@/core/utils/logger';

export interface BranchNotificationPayload {
  id?: string;
  company_id: string;
  target_branch_id: string;
  message: string;
  created_at?: string;
}

export const subscribeToBranchNotifications = (
  companyId: string,
  onNotification: (payload: BranchNotificationPayload) => void
) => {
  const channel = supabase
    .channel('branch-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'branch_notifications',
        filter: `company_id=eq.${companyId}`,
      },
      payload => {
        onNotification(payload.new as BranchNotificationPayload);
      }
    )
    .subscribe((status, err) => {
      if (status === 'SUBSCRIBED') {
        logger.debug('BranchesAPI', 'Subscribed to cross-branch notifications');
      } else if (err) {
        console.error('Error subscribing to cross-branch notifications:', err);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
};
