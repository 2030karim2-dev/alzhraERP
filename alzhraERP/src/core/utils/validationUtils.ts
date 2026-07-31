/**
 * Validation utilities for RPC payloads
 * H6: Ensures data integrity before sending to Supabase RPCs
 */

export interface ValidationError {
    field: string;
    message: string;
}

/**
 * Validate invoice items before sending to RPC
 */
export const validateInvoiceItems = (
    items: Array<{ productId?: string | undefined; quantity?: number | undefined; unitPrice?: number | undefined; costPrice?: number | undefined }>
): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (!items || items.length === 0) {
        errors.push({ field: 'items', message: 'يجب إضافة صنف واحد على الأقل' });
        return errors;
    }

    items.forEach((item, index) => {
        if (!item.productId) {
            errors.push({ field: `items[${index}].productId`, message: `الصنف ${index + 1}: يجب تحديد المنتج` });
        }
        if (!item.quantity || item.quantity <= 0) {
            errors.push({ field: `items[${index}].quantity`, message: `الصنف ${index + 1}: الكمية يجب أن تكون أكبر من صفر` });
        }
        const price = item.unitPrice ?? item.costPrice ?? 0;
        if (price < 0) {
            errors.push({ field: `items[${index}].price`, message: `الصنف ${index + 1}: السعر لا يمكن أن يكون سالباً` });
        }
    });

    return errors;
};

/**
 * Validate a sale invoice payload before RPC
 */
export const validateSalePayload = (payload: {
    items: Array<{ productId?: string; quantity?: number; unitPrice?: number }>;
    paymentMethod?: string;
}): ValidationError[] => {
    const errors = validateInvoiceItems(payload.items);

    if (!payload.paymentMethod) {
        errors.push({ field: 'paymentMethod', message: 'يجب تحديد طريقة الدفع' });
    }

    return errors;
};

/**
 * Validate a purchase payload before RPC
 */
export const validatePurchasePayload = (payload: {
    items: Array<{ productId?: string; quantity?: number; costPrice?: number }>;
    issueDate?: string;
}): ValidationError[] => {
    const errors = validateInvoiceItems(
        payload.items.map(i => ({ ...i, unitPrice: i.costPrice }))
    );

    if (!payload.issueDate) {
        errors.push({ field: 'issueDate', message: 'يجب تحديد تاريخ الفاتورة' });
    }

    return errors;
};

/**
 * Throw an error if validation fails
 */
export const assertValid = (errors: ValidationError[]): void => {
    if (errors.length > 0) {
        const messages = errors.map(e => e.message).join('\n');
        throw new Error(`أخطاء في التحقق من البيانات:\n${messages}`);
    }
};
