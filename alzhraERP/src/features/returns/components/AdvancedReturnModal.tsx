import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';
import * as z from 'zod';
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
  // 1. Resizing Core State
  const [isMaximized, setIsMaximized] = useState(false);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [position, setPosition] = useState({ x: 0, y: 0 }); // Start center logic happens in mount effect
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);
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

  // Center on first open and check mobile
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        // Force maximized-like state on mobile
        setPosition({ x: 0, y: 0 });
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    if (isOpen && !isMaximized && !isMobile) {
      const innerWidth = window.innerWidth;
      const innerHeight = window.innerHeight;
      setPosition({
        x: Math.max(0, (innerWidth - size.width) / 2),
        y: Math.max(0, (innerHeight - size.height) / 2),
      });
    }

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [isOpen, isMaximized, size.width, size.height, isMobile]);

  // Drag Handlers
  const handleDragStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Only drag from the header area, not buttons
      if ((e.target as HTMLElement).closest('button')) return;

      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    },
    [position]
  );

  const handleDrag = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: Math.max(0, e.clientX - dragOffset.x),
        y: Math.max(0, e.clientY - dragOffset.y),
      });
    },
    [isDragging, dragOffset]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('mouseup', handleDragEnd);
    } else {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging, handleDrag, handleDragEnd]);

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

  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="animate-in fade-in pointer-events-auto fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        ref={modalRef}
        className={`pointer-events-auto absolute flex flex-col border border-slate-200 bg-[var(--app-surface)] shadow-2xl transition-[width,height,transform,border-radius] duration-200 ease-in-out dark:border-slate-700 ${isMaximized || isMobile ? 'rounded-none' : 'rounded-2xl'} `}
        style={{
          width: isMaximized || isMobile ? '100vw' : `${size.width}px`,
          height: isMaximized || isMobile ? '100vh' : `${size.height}px`,
          transform:
            isMaximized || isMobile
              ? 'translate(0px, 0px)'
              : `translate(${position.x}px, ${position.y}px)`,
          left: 0,
          top: 0,
        }}
      >
        {/* Header / Drag Handle */}
        <div
          className={`flex flex-none items-center justify-between border-b border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/50 max-md:p-4 ${isMaximized || isMobile ? '' : 'cursor-move'}`}
          onMouseDown={!isMaximized && !isMobile ? handleDragStart : undefined}
          onDoubleClick={
            !isMobile
              ? () => {
                  setIsMaximized(!isMaximized);
                }
              : undefined
          }
        >
          <div className="pointer-events-none flex select-none items-center gap-3 max-md:gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/50">
              <RefreshCw size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold uppercase text-slate-800 dark:text-slate-100">
                {returnType === 'sale' ? 'إضافة مرتجع مبيعات' : 'إضافة مرتجع مشتريات'}
              </h2>
              <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400">
                نافذة مرتجعات متقدمة
              </p>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-1 max-md:gap-1.5">
            {!isMobile && (
              <button
                onClick={() => {
                  setIsMaximized(!isMaximized);
                }}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 max-md:p-2"
                title={isMaximized ? 'تصغير' : 'تكبير'}
              >
                {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            )}
            <button
              className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/40 dark:hover:text-red-400 max-md:p-2"
              onClick={onClose}
              title="إغلاق (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Form Provider Context */}
        <FormProvider {...methods}>
          <form
            id="advanced-return-form"
            className="flex flex-1 flex-col overflow-hidden"
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

            {/* Footer / Actions */}
            <div className="flex flex-none items-center justify-between border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/80 max-md:p-4">
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
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition-all hover:bg-indigo-700 dark:shadow-indigo-900/20 max-md:gap-2"
                >
                  حفظ المرتجع
                </button>
              </div>
            </div>
          </form>
        </FormProvider>

        {/* Resize Handle (Bottom-Right/Left depending on RTL/LTR) */}
        {!isMaximized && !isMobile && (
          <div
            className="absolute bottom-0 left-0 z-10 h-4 w-4 cursor-sw-resize"
            onMouseDown={e => {
              e.preventDefault();
              const startX = e.clientX;
              const startY = e.clientY;
              const startWidth = size.width;
              const startHeight = size.height;
              const startPosX = position.x;

              // Assuming RTL: dragging left-bottom corner changes width AND position X
              const handleResize = (e: MouseEvent) => {
                const diffX = e.clientX - startX;
                const diffY = e.clientY - startY;

                setSize({
                  width: Math.max(600, startWidth - diffX),
                  height: Math.max(400, startHeight + diffY),
                });

                setPosition((prev: { x: number; y: number }) => ({
                  ...prev,
                  x: startPosX + diffX,
                }));
              };

              const stopResize = () => {
                window.removeEventListener('mousemove', handleResize);
                window.removeEventListener('mouseup', stopResize);
              };

              window.addEventListener('mousemove', handleResize);
              window.addEventListener('mouseup', stopResize);
            }}
          ></div>
        )}
      </div>
    </div>,
    document.body
  );
};
