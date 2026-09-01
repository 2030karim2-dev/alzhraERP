import React, { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';
import * as z from 'zod';
import Modal from '../../../ui/base/Modal';
import { useFeedbackStore } from '../../feedback/store';
import { zodResolver } from '../../../lib/zodResolver';
import type { ReturnType } from '../types';
import { ReturnItemsStep } from './ReturnItemsStep';
import { ReturnDetailsStep } from './ReturnDetailsStep';
import { useSalesInvoicesForReturn, useCreateSalesReturn } from '../../sales/hooks/useSalesReturns';
import {
  usePurchaseInvoicesForReturn,
  useCreatePurchaseReturn,
} from '../../purchases/hooks/usePurchaseReturns';
import type { PurchaseItem } from '../../purchases/types';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateByPreset } from '../../../lib/invalidation';
import { mapReturnStatus } from '../utils/returnHelpers';
import type { Invoice } from '../types';
import { logger } from '../../../core/utils/logger';

interface AdvancedReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnType: ReturnType;
  onSuccess: () => void;
  partyName?: string | undefined;
  partyId?: string | undefined;
  initialInvoiceId?: string | undefined;
}

// Validation Schema using Zod
const returnSchema = z.object({
  invoiceId: z.string().min(1, 'يرجى اختيار الفاتورة الأصلية'),
  items: z
    .array(
      z.object({
        productId: z.string(),
        name: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        costPrice: z.number().optional(),
        returnQuantity: z.number().min(0),
        maxQuantity: z.number(),
      })
    )
    .min(1, 'يجب دمج عناصر للإرجاع')
    .refine(items => items.some(item => item.returnQuantity > 0), {
      message: 'يجب اختيار كمية للإرجاع في واحد على الأقل من الأصناف',
      path: ['items'], // show error on the items array
    }),
  returnReason: z.string().min(1, 'يرجى اختيار سبب الإرجاع'),
  status: z.enum(['processing', 'accepted', 'rejected']),
  notes: z.string().optional(),
  date: z.string().min(1, 'يرجى تحديد تاريخ الإرجاع'),
});

type ReturnFormValues = z.infer<typeof returnSchema>;

/** فاتورة مرجعية (مبيعات/مشتريات) كما يعيدها hooks الإرجاع — تمدّد `Invoice` بالحقول الإضافية المستعملة فقط. */
interface SourceReturnInvoice extends Invoice {
  party_id?: string | null;
  currency?: string | null;
  created_at?: string | null;
}

export const AdvancedReturnModal: React.FC<AdvancedReturnModalProps> = ({
  isOpen,
  onClose,
  returnType,
  onSuccess,

  partyId,
  initialInvoiceId,
}) => {
  const { showToast } = useFeedbackStore();
  const queryClient = useQueryClient();

  // Need to fetch invoices based on type
  const { data: salesInvoices, isLoading: isLoadingSales } = useSalesInvoicesForReturn(
    returnType === 'sale' ? partyId : null
  );
  const { data: purchaseInvoices, isLoading: isLoadingPurchases } = usePurchaseInvoicesForReturn(
    (returnType === 'purchase' ? partyId : null) as string | null
  );

  const invoices: SourceReturnInvoice[] =
    returnType === 'sale'
      ? ((salesInvoices || []) as unknown as SourceReturnInvoice[])
      : ((purchaseInvoices || []) as unknown as SourceReturnInvoice[]);
  const isLoadingInvoices = returnType === 'sale' ? isLoadingSales : isLoadingPurchases;

  // Mutations
  const createSalesReturn = useCreateSalesReturn();
  const createPurchaseReturn = useCreatePurchaseReturn();

  // Form Hook
  const methods = useForm<ReturnFormValues>({
    resolver: zodResolver(returnSchema),
    defaultValues: {
      invoiceId: initialInvoiceId || '',
      date: new Date().toISOString().split('T')[0],
      status: 'processing',
      items: [],
      returnReason: '',
    },
    mode: 'onChange',
  });

  useEffect(() => {
    if (initialInvoiceId && isOpen) {
      methods.setValue('invoiceId', initialInvoiceId);
    }
  }, [initialInvoiceId, isOpen, methods]);

  // Handle Escape Key for closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        // Implement safety check (unsaved changes) here later
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Handle Escape Key for closing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Focus Trap & Overlay Lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalTitle = returnType === 'sale' ? 'إضافة مرتجع مبيعات' : 'إضافة مرتجع مشتريات';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={RefreshCw}
      title={modalTitle}
      description="نافذة مرتجعات متقدمة"
      size="resizable"
      footer={
        <div className="flex w-full items-center justify-between gap-2 max-md:gap-2">
          <div className="text-xs font-medium text-slate-500">
            استخدم مفاتيح{' '}
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono dark:bg-slate-700">
              ↑↓
            </span>{' '}
            و{' '}
            <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono dark:bg-slate-700">
              Tab
            </span>{' '}
            للتنقل.
          </div>
          <div className="flex items-center gap-2 max-md:gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              إلغاء الأمر
            </button>
            <button
              type="submit"
              form="advanced-return-form"
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 dark:shadow-indigo-900/20 max-md:gap-2"
            >
              حفظ المرتجع
            </button>
          </div>
        </div>
      }
    >
      {/* Form Provider Context */}
      <FormProvider {...methods}>
        <form
          id="advanced-return-form"
          className="flex flex-1 flex-col"
          onSubmit={methods.handleSubmit(async data => {
            try {
              const selectedItems = data.items
                .filter(item => item.returnQuantity > 0)
                .map(item => ({
                  productId: item.productId,
                  name: item.name,
                  quantity: item.returnQuantity,
                  unitPrice: item.unitPrice,
                  costPrice: item.costPrice ?? 0,
                }));

              const selectedInvoice = invoices.find(inv => inv.id === data.invoiceId);
              if (!selectedInvoice) throw new Error('الفاتورة الأصلية غير موجودة');
              const invoiceCurrency = selectedInvoice.currency ?? selectedInvoice.currency_code;

              if (returnType === 'sale') {
                await createSalesReturn.mutateAsync({
                  invoiceId: data.invoiceId,
                  partyId: selectedInvoice.party?.id ?? selectedInvoice.party_id ?? '',
                  ...(selectedInvoice.payment_method
                    ? { paymentMethod: selectedInvoice.payment_method }
                    : {}),
                  items: selectedItems,
                  returnReason: data.returnReason,
                  status: mapReturnStatus(data.status),
                  issueDate: data.date,
                  ...(invoiceCurrency ? { currency: invoiceCurrency } : {}),
                  ...(selectedInvoice.exchange_rate != null
                    ? { exchangeRate: selectedInvoice.exchange_rate }
                    : {}),
                  ...(data.notes ? { notes: data.notes } : {}),
                });
              } else if (returnType === 'purchase') {
                // إصلاح: مرتجع المشتريات لم يكن يُنشأ إطلاقاً
                await createPurchaseReturn.mutateAsync({
                  supplierId: selectedInvoice.party?.id ?? selectedInvoice.party_id ?? null,
                  items: selectedItems.map(item => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    costPrice: item.costPrice ?? 0,
                    discount: 0,
                  })) as unknown as PurchaseItem[],
                  invoiceNumber: selectedInvoice.invoice_number ?? '',
                  issueDate: data.date,
                  notes: data.notes || '',
                  status: data.status === 'accepted' ? 'posted' : 'draft',
                  paymentMethod: 'cash',
                  currency: selectedInvoice.currency_code ?? 'SAR',
                  exchangeRate: selectedInvoice.exchange_rate ?? 1,
                  referenceInvoiceId: data.invoiceId,
                  returnReason: data.returnReason,
                });
              }

              invalidateByPreset(queryClient, returnType === 'sale' ? 'saleReturn' : 'purchase');
              void queryClient.invalidateQueries({ queryKey: ['sales-returns'] });
              void queryClient.invalidateQueries({ queryKey: ['purchase_returns'] });
              void queryClient.invalidateQueries({ queryKey: ['purchases'] });
              void queryClient.invalidateQueries({ queryKey: ['invoices'] });

              onSuccess();
              onClose();
            } catch (error) {
              logger.error('AdvancedReturnModal', 'Error saving return:', error);
              const err = error as { message?: string };
              showToast(
                err?.message || 'فشل حفظ المرتجع، يرجى التحقق من البيانات والمحاولة مرة أخرى',
                'error'
              );
            }
          })}
        >
          {/* Scrollable Content Area */}
          <div className="flex-1 space-y-8 overflow-y-auto p-6 max-md:p-3">
            {/* Sections combined into a single scrollable view */}

            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100 max-md:gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                  1
                </span>
                اختيار الفاتورة والأصناف
              </h2>
              <ReturnItemsStep invoices={invoices} isLoadingInvoices={isLoadingInvoices} />
            </div>

            <div className="block border-t-2 border-slate-100 dark:border-slate-800/50"></div>

            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-100 max-md:gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                  2
                </span>
                تفاصيل ومبررات الإرجاع
              </h2>
              <ReturnDetailsStep />
            </div>
          </div>
        </form>
      </FormProvider>
    </Modal>
  );
};
