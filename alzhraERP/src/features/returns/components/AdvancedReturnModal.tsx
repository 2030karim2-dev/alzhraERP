import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { useForm, FormProvider } from 'react-hook-form';
import * as z from 'zod';
import { useFeedbackStore } from '../../feedback/store';
import { zodResolver } from '../../../lib/zodResolver';
import { ReturnType } from '../types';
import { ReturnItemsStep } from './ReturnItemsStep';
import { ReturnDetailsStep } from './ReturnDetailsStep';
import { useSalesInvoicesForReturn, useCreateSalesReturn } from '../../sales/hooks/useSalesReturns';
import { usePurchaseInvoicesForReturn } from '../../purchases/hooks/usePurchaseReturns';

interface AdvancedReturnModalProps {
    isOpen: boolean;
    onClose: () => void;
    returnType: ReturnType;
    onSuccess: () => void;
    partyName?: string;
    partyId?: string;
}

// Validation Schema using Zod
const returnSchema = z.object({
    invoiceId: z.string().min(1, 'يرجى اختيار الفاتورة الأصلية'),
    items: z.array(z.object({
        productId: z.string(),
        name: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        returnQuantity: z.number().min(0),
        maxQuantity: z.number()
    })).min(1, 'يجب دمج عناصر للإرجاع')
        .refine((items) => items.some(item => item.returnQuantity > 0), {
            message: 'يجب اختيار كمية للإرجاع في واحد على الأقل من الأصناف',
            path: ['items'] // show error on the items array
        }),
    returnReason: z.string().min(1, 'يرجى اختيار سبب الإرجاع'),
    status: z.enum(['draft', 'posted', 'paid', 'void']),
    notes: z.string().optional(),
    date: z.string().min(1, 'يرجى تحديد تاريخ الإرجاع'),
});

type ReturnFormValues = z.infer<typeof returnSchema>;

export const AdvancedReturnModal: React.FC<AdvancedReturnModalProps> = ({
    isOpen,
    onClose,
    returnType,
    onSuccess,

    partyId,
}) => {
    // 1. Resizing Core State
    const [isMaximized, setIsMaximized] = useState(false);
    const [size, setSize] = useState({ width: 800, height: 600 });
    const [position, setPosition] = useState({ x: 0, y: 0 }); // Start center logic happens in mount effect
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const modalRef = useRef<HTMLDivElement>(null);
    const { } = useFeedbackStore();

    // Need to fetch invoices based on type
    const { data: salesInvoices, isLoading: isLoadingSales } = useSalesInvoicesForReturn((returnType === 'sale' ? partyId : null) as string | null);
    const { data: purchaseInvoices, isLoading: isLoadingPurchases } = usePurchaseInvoicesForReturn((returnType === 'purchase' ? partyId : null) as string | null);

    const invoices = returnType === 'sale' ? (salesInvoices || []) : (purchaseInvoices || []);
    const isLoadingInvoices = returnType === 'sale' ? isLoadingSales : isLoadingPurchases;

    // Mutations
    const createSalesReturn = useCreateSalesReturn();
    // (Assuming purchase return mutation exists or will be similar)
    // const createPurchaseReturn = useCreatePurchaseReturn();

    // Form Hook
    const methods = useForm<ReturnFormValues>({
        resolver: zodResolver(returnSchema),
        defaultValues: {
            date: new Date().toISOString().split('T')[0],
            status: 'posted',
            items: [],
            returnReason: ''
        },
        mode: 'onChange',
    });

    // Handle Escape Key for closing
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                // Implement safety check (unsaved changes) here later
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
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
                y: Math.max(0, (innerHeight - size.height) / 2)
            });
        }

        return () => window.removeEventListener('resize', checkMobile);
    }, [isOpen, isMaximized, size.width, size.height, isMobile]);

    // Drag Handlers
    const handleDragStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        // Only drag from the header area, not buttons
        if ((e.target as HTMLElement).closest('button')) return;

        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    }, [position]);

    const handleDrag = useCallback((e: MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: Math.max(0, e.clientX - dragOffset.x),
            y: Math.max(0, e.clientY - dragOffset.y)
        });
    }, [isDragging, dragOffset]);

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
        return () => { document.body.style.overflow = 'auto'; };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm pointer-events-auto transition-opacity duration-300 animate-in fade-in"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div
                ref={modalRef}
                className={`
                    absolute bg-white dark:bg-slate-900 shadow-2xl flex flex-col pointer-events-auto
                    transition-[width,height,transform,border-radius] duration-200 ease-in-out border border-slate-200 dark:border-slate-700
                    ${(isMaximized || isMobile) ? 'rounded-none' : 'rounded-2xl'}
                `}
                style={{
                    width: (isMaximized || isMobile) ? '100vw' : `${size.width}px`,
                    height: (isMaximized || isMobile) ? '100vh' : `${size.height}px`,
                    transform: (isMaximized || isMobile) ? 'translate(0px, 0px)' : `translate(${position.x}px, ${position.y}px)`,
                    left: 0,
                    top: 0,
                }}
            >
                {/* Header / Drag Handle */}
                <div
                    className={`flex flex-none items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 ${(isMaximized || isMobile) ? '' : 'cursor-move'}`}
                    onMouseDown={(!isMaximized && !isMobile) ? handleDragStart : undefined}
                    onDoubleClick={!isMobile ? () => setIsMaximized(!isMaximized) : undefined}
                >
                    <div className="flex items-center gap-3 select-none pointer-events-none">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                            <RefreshCw size={18} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase">
                                {returnType === 'sale' ? 'إضافة مرتجع مبيعات' : 'إضافة مرتجع مشتريات'}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
                                نافذة مرتجعات متقدمة
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 pointer-events-auto">
                        {!isMobile && (
                            <button
                                onClick={() => setIsMaximized(!isMaximized)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
                                title={isMaximized ? "تصغير" : "تكبير"}
                            >
                                {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                            </button>
                        )}
                        <button
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-400 rounded-lg text-slate-500 dark:text-slate-400 transition-colors"
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
                        className="flex flex-col flex-1 overflow-hidden"
                        onSubmit={methods.handleSubmit(async (data) => {
                            try {
                                const selectedItems = data.items
                                    .filter(item => item.returnQuantity > 0)
                                    .map(item => ({
                                        productId: item.productId,
                                        name: item.name,
                                        quantity: item.returnQuantity,
                                        unitPrice: item.unitPrice,
                                        costPrice: (item as any).costPrice || 0 // Include cost price if available
                                    }));

                                if (returnType === 'sale') {
                                    const selectedInvoice = invoices.find((inv: any) => inv.id === data.invoiceId);

                                    const payload: any = {
                                        invoiceId: data.invoiceId,
                                        partyId: selectedInvoice?.party?.id || (selectedInvoice as any)?.party_id,
                                        paymentMethod: (selectedInvoice as any)?.payment_method,
                                        items: selectedItems,
                                        returnReason: data.returnReason,
                                        status: data.status,
                                        issueDate: data.date,
                                        currency: (selectedInvoice as any)?.currency || (selectedInvoice as any)?.currency_code,
                                        exchangeRate: (selectedInvoice as any)?.exchange_rate
                                    };
                                    if (data.notes) payload.notes = data.notes;

                                    await createSalesReturn.mutateAsync(payload);
                                }

                                onSuccess();
                                onClose();
                            } catch (error) {
                                console.error('Error saving return:', error);
                            }
                        })}
                    >
                        {/* Scrollable Content Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Sections combined into a single scrollable view */}

                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                                    اختيار الفاتورة والأصناف
                                </h2>
                                <ReturnItemsStep invoices={invoices as any} isLoadingInvoices={isLoadingInvoices} />
                            </div>

                            <div className="border-t-2 border-slate-100 dark:border-slate-800/50 block"></div>

                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                                    تفاصيل ومبررات الإرجاع
                                </h2>
                                <ReturnDetailsStep />
                            </div>
                        </div>

                        {/* Footer / Actions */}
                        <div className="flex flex-none items-center justify-between p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80">
                            <div className="text-xs text-slate-500 font-medium">
                                استخدم مفاتيح <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">↑↓</span> و <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">Tab</span> للتنقل.
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                >
                                    إلغاء الأمر
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 transition-all flex items-center gap-2"
                                >
                                    حفظ المرتجع
                                </button>
                            </div>
                        </div>
                    </form>
                </FormProvider>

                {/* Resize Handle (Bottom-Right/Left depending on RTL/LTR) */}
                {(!isMaximized && !isMobile) && (
                    <div
                        className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize z-10"
                        onMouseDown={(e) => {
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
                                    height: Math.max(400, startHeight + diffY)
                                });

                                setPosition((prev: { x: number; y: number }) => ({
                                    ...prev,
                                    x: startPosX + diffX
                                }));
                            };

                            const stopResize = () => {
                                window.removeEventListener('mousemove', handleResize);
                                window.removeEventListener('mouseup', stopResize);
                            };

                            window.addEventListener('mousemove', handleResize);
                            window.addEventListener('mouseup', stopResize);
                        }}
                    >
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
