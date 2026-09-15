import { useQuery } from '@tanstack/react-query';
import { salesApi } from '@/features/sales/api';
import { useAuthStore } from '@/features/auth/store';
import { useBranchFilter } from '@/features/branches/hooks/useBranchFilter';

export const useNextInvoiceNumber = () => {
  const { user } = useAuthStore();
  const { branchId } = useBranchFilter();

  // [AUDIT-FIX] generate_invoice_number تُرجع رقماً منسّقاً (INV-YYYYMMDD-NNNN)
  // مطابقاً لما يعتمده الخادم مع مراعاة الفرع النشط (branchId).
  const fetchNumber = async (): Promise<string> => {
    const companyId = user?.company_id ?? '';
    if (companyId === '') return '---';

    const generated = await salesApi.getNextGeneratedNumber(companyId, 'sale', branchId);
    if (generated.error === null && generated.data !== null && generated.data !== '') {
      return generated.data;
    }

    const legacy = await salesApi.getNextSequence(companyId, 'invoice');
    if (legacy.error === null && legacy.data !== null && legacy.data !== '') {
      return legacy.data;
    }
    return '---';
  };

  return useQuery({
    queryKey: ['next_invoice_number', user?.company_id, branchId],
    queryFn: fetchNumber,
    enabled: Boolean(user?.company_id),
    staleTime: 0,
  });
};
