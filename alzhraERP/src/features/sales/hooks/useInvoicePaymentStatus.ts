import { useMemo } from 'react';

export const useInvoicePaymentStatus = (invoice: any) => {
  const paymentInfo = useMemo(() => {
    if (!invoice) return null;

    // Extract actual payment amounts from the nested structure
    const paymentsList = (invoice.payment_allocations as any[])?.map((pa) => pa.payments).filter(Boolean) || [];
    const paidFromAllocations = paymentsList.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // Use the higher of the sum of allocations or the invoice-level paid_amount (since RPC usually updates paid_amount)
    const paidAmount = Math.max(paidFromAllocations, (invoice as Record<string, unknown>).paid_amount as number || 0);
    const remainingAmount = invoice.total_amount - paidAmount;

    // Fallback: If payment_method is cash and there are no payments but status is 'posted' or 'paid'
    // It's likely paid at the RPC level.
    const isPaid = remainingAmount <= 0 || (invoice.payment_method === 'cash' && (invoice.status === 'paid' || invoice.status === 'posted'));

    return {
      total: invoice.total_amount,
      paid: paidAmount,
      remaining: isPaid ? 0 : Math.max(0, remainingAmount),
      isPaid,
      isPartial: paidAmount > 0 && remainingAmount > 0 && !isPaid
    };
  }, [invoice]);

  return paymentInfo;
};
