import { useMemo } from 'react';
import { useAccounts } from './useAccounts';

export const usePaymentAccounts = () => {
  const { data: accounts, isLoading } = useAccounts();

  const paymentAccounts = useMemo(() => {
    // 1. Get all liquid accounts (starting with '10')
    const liquidAccounts = accounts?.filter(a => a.code.startsWith('10')) || [];

    // 2. Identify parent accounts (accounts that have children within the liquid group)
    const parentIds = new Set(liquidAccounts.map(a => a.parent_id).filter(Boolean));

    // 3. We want the exact sub-accounts (e.g., Al-Kuraimi SAR, Cash Box YER) 
    // An account is selectable if it is NOT a parent to other accounts.
    return liquidAccounts.filter(a => !parentIds.has(a.id));
  }, [accounts]);

  return { data: paymentAccounts, isLoading };
};
