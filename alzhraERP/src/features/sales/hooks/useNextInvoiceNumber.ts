import { useQuery } from '@tanstack/react-query';
import { salesApi } from '@/features/sales/api';
import { useAuthStore } from '@/features/auth/store';

export const useNextInvoiceNumber = () => {
  const { user } = useAuthStore();

  // [AUDIT-FIX] generate_invoice_number تُرجع رقماً منسّقاً (INV-YYYYMMDD-NNNN)
  // مطابقاً لما يعتمده الخادم. احتياطياً: get_next_sequence('invoice') (فرع
  // حقيقي في الدالة) بدلاً من 'sale' الذي كان يرجع '1' دائماً.
  const fetchNumber = async (): Promise<string> => {
    const companyId = user?.company_id ?? '';
    if (companyId === '') return '---';

    const generated = await salesApi.getNextGeneratedNumber(companyId, 'sale');
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
    queryKey: ['next_invoice_number', user?.company_id],
    queryFn: fetchNumber,
    enabled: Boolean(user?.company_id),
    staleTime: 0,
  });
};
