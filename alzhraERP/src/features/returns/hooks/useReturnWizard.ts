import { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useSalesInvoicesForReturn, useCreateSalesReturn } from '../../sales/hooks/useSalesReturns';
import { usePurchaseInvoicesForReturn, useCreatePurchaseReturn } from '../../purchases/hooks/usePurchaseReturns';
import { Invoice, ReturnType } from '../types';

export const useReturnWizard = (
    returnType: ReturnType,
    propInvoices?: Invoice[],
    partyId?: string,
    onSubmitProp?: (data: any) => void,
    onSuccess?: () => void,
    onClose?: () => void
) => {
    const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('');
    const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
    const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
    const [step, setStep] = useState(1);

    // Fetch invoices from database if not provided as props
    const { data: salesInvoices, isLoading: isLoadingSalesInvoices } = useSalesInvoicesForReturn(null);
    const { data: purchaseInvoices, isLoading: isLoadingPurchaseInvoices } = usePurchaseInvoicesForReturn(null);

    // Create return mutations
    const createSalesReturn = useCreateSalesReturn();
    const createPurchaseReturn = useCreatePurchaseReturn();

    // Use provided invoices or fetched ones
    const invoices = propInvoices || (returnType === 'sale' ? salesInvoices : purchaseInvoices);
    const isLoadingInvoices = returnType === 'sale' ? isLoadingSalesInvoices : isLoadingPurchaseInvoices;
    const isCreating = returnType === 'sale' ? createSalesReturn.isPending : createPurchaseReturn.isPending;

    const { register, handleSubmit, watch, reset, control, formState: { errors } } = useForm({
        defaultValues: {
            returnReason: '',
            notes: '',
            date: new Date().toISOString().split('T')[0],
            status: 'processing' as 'processing' | 'accepted' | 'rejected',
        },
        mode: 'onChange'
    });

    const watchedReturnReason = watch('returnReason');

    // Get selected invoice
    const selectedInvoice = useMemo(() => {
        return (invoices || []).find((inv: any) => inv.id === selectedInvoiceId);
    }, [invoices, selectedInvoiceId]);

    // Calculate total amount
    const totalAmount = useMemo(() => {
        if (!selectedInvoice?.invoice_items) return 0;
        return selectedInvoice.invoice_items.reduce((sum: number, item: any) => {
            const qty = returnQuantities[item.id] || 0;
            return sum + (qty * item.unit_price);
        }, 0);
    }, [selectedInvoice, returnQuantities]);

    // Calculate total items count
    const totalItemsCount = useMemo(() => {
        return Object.entries(returnQuantities).reduce((sum: number, [, qty]) => {
            return sum + (qty > 0 ? qty : 0);
        }, 0);
    }, [returnQuantities]);

    // Validate form
    const hasValidItems = useMemo(() => {
        return Object.entries(returnQuantities).some(([, qty]) => qty > 0);
    }, [returnQuantities]);

    // Form validation
    const validateForm = useCallback(() => {
        const validationErrors: string[] = [];

        if (!selectedInvoiceId) {
            validationErrors.push('يرجى اختيار الفاتورة الأصلية');
        }

        if (!hasValidItems) {
            validationErrors.push('يرجى اختيار أصناف للإرجاع');
        }

        if (!watchedReturnReason) {
            validationErrors.push('يرجى اختيار سبب الإرجاع');
        }

        return validationErrors;
    }, [selectedInvoiceId, hasValidItems, watchedReturnReason]);

    // Handle item selection
    const handleItemSelect = useCallback((itemId: string, selected: boolean) => {
        setSelectedItems(prev => ({
            ...prev,
            [itemId]: selected
        }));
        if (!selected) {
            setReturnQuantities(prev => ({
                ...prev,
                [itemId]: 0
            }));
        }
    }, []);

    // Handle quantity change with validation
    const handleQuantityChange = useCallback((itemId: string, quantity: number, maxQty: number = 0) => {
        // Get the actual max quantity from the invoice item if not provided
        if (!maxQty && selectedInvoice?.invoice_items) {
            const item = selectedInvoice.invoice_items.find((i: any) => i.id === itemId);
            maxQty = item?.quantity || 0;
        }
        const validQty = Math.min(Math.max(0, quantity), maxQty);
        setReturnQuantities(prev => ({
            ...prev,
            [itemId]: validQty
        }));
        // Auto-select the item when quantity is set
        if (validQty > 0) {
            setSelectedItems(prev => ({ ...prev, [itemId]: true }));
        }
    }, [selectedInvoice]);

    // Handle invoice selection
    const handleInvoiceSelect = useCallback((invoiceId: string) => {
        setSelectedInvoiceId(invoiceId);
        setReturnQuantities({});
        setSelectedItems({});
        setStep(2);
    }, []);

    // Reset state on close
    const handleClose = useCallback(() => {
        setSelectedInvoiceId('');
        setReturnQuantities({});
        setSelectedItems({});
        setStep(1);
        reset();
        onClose?.();
    }, [onClose, reset]);

    // Handle form submission with validation
    const handleFormSubmit = async (data: { returnReason: string; notes: string; date: string; status: 'processing' | 'accepted' | 'rejected' }) => {
        const validationErrors = validateForm();

        if (validationErrors.length > 0) {
            return;
        }

        if (!selectedInvoice) return;

        const items = selectedInvoice.invoice_items
            ?.filter((item: any) => returnQuantities[item.id] > 0 && selectedItems[item.id])
            .map((item: any) => ({
                productId: item.product_id,
                name: item.description,
                quantity: item.quantity,
                unitPrice: item.unit_price,
                returnQuantity: returnQuantities[item.id]
            })) || [];

        // If onSubmit prop is provided, call it
        if (onSubmitProp) {
            onSubmitProp({
                invoiceId: selectedInvoiceId,
                items,
                returnReason: data.returnReason,
                notes: data.notes,
                date: data.date,
                status: data.status,
            });
            handleClose();
            onSuccess?.();
            return;
        }

        // Otherwise, use the mutations to create the return
        try {
            const returnData = {
                invoiceId: selectedInvoiceId,
                referenceInvoiceId: selectedInvoiceId,
                partyId: selectedInvoice.party?.id || partyId || '',
                supplierId: selectedInvoice.party?.id || partyId || null,
                invoiceNumber: selectedInvoice.invoice_number || '',
                paymentMethod: 'cash' as const,
                issueDate: data.date,
                returnReason: data.returnReason,
                notes: data.notes,
                status: (data.status === 'accepted' ? 'posted' : 'draft') as 'posted' | 'draft',
                items: items.map((item: any) => ({
                    productId: item.productId,
                    name: item.name,
                    quantity: item.returnQuantity,
                    unitPrice: item.unitPrice,
                    // Fix: Use actual cost_price from invoice items instead of hardcoded 60%
                    unitCost: item.costPrice || item.unitPrice,
                    costPrice: item.costPrice || item.unitPrice,
                })),
            };

            if (returnType === 'sale') {
                await createSalesReturn.mutateAsync(returnData as any);
            } else {
                await createPurchaseReturn.mutateAsync(returnData as any);
            }

            handleClose();
            onSuccess?.();
        } catch (error) {
            console.error('Error creating return:', error);
        }
    };

    return {
        step,
        setStep,
        selectedInvoiceId,
        invoices,
        isLoadingInvoices,
        isCreating,
        selectedInvoice,
        returnQuantities,
        selectedItems,
        totalAmount,
        totalItemsCount,
        hasValidItems,
        watchedReturnReason,
        validationErrors: validateForm(),
        register,
        handleSubmit,
        control,
        errors,
        handleItemSelect,
        handleQuantityChange,
        handleInvoiceSelect,
        handleFormSubmit,
        handleClose
    };
};
