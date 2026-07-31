// ============================================
// Sales Hooks Index
// Export all sales-related hooks
// ============================================

export { useInvoices, useSalesStats } from './useInvoices';
export { useInvoiceDetails } from './useInvoiceDetails';
export { useCreateInvoice } from './useInvoices'; // useCreateInvoice was actually in useInvoices.ts originally
export { useNextInvoiceNumber } from './useNextInvoiceNumber';
export { useDeleteInvoice } from './useDeleteInvoice';
export { useProductSearch } from './useProductSearch';
export { useSalesAnalytics } from './useSalesAnalytics';
export { useSalesSeed } from './useSalesSeed';
export { useQuotationForm } from './useQuotationForm';
export { useInvoicePaymentStatus } from './useInvoicePaymentStatus';

// Sales Returns
export { useSalesReturns, useSalesReturnsStats, useCreateSalesReturn, useSalesInvoicesForReturn } from './useSalesReturns';
