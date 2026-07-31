import { useQuery } from '@tanstack/react-query';
import { salesApi } from '@/features/sales/api';
import { useAuthStore } from '@/features/auth/store';

export const useNextInvoiceNumber = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['next_invoice_number', user?.company_id],
    queryFn: async () => {
      if (!user?.company_id) return '---';
      const { data, error } = await salesApi.getNextSequence(user.company_id, 'sale');
      if (error) return '---';
      return data;
    },
    enabled: !!user?.company_id,
    staleTime: 0,
  });
};
