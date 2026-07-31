import { z } from 'zod';

// Helper for numeric inputs that might come from text fields as strings
const numericStringOrNumber = z
    .union([z.number(), z.string()])
    .transform((val) => {
        if (typeof val === 'number') return val;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? 0 : parsed;
    });

export const productFormSchema = z.object({
    name: z.string().min(2, 'يجب أن يحتوي الاسم على حرفين على الأقل'),
    name_ar: z.string().optional(),
    name_en: z.string().optional(),
    sku: z.string().optional().nullable(),
    part_number: z.string().optional().nullable(),
    brand: z.string().optional().nullable(),
    size: z.string().optional().nullable(),
    specifications: z.string().optional().nullable(),
    alternative_numbers: z.string().optional().nullable(),
    image_url: z.string().optional().nullable(),
    barcode: z.string().optional().nullable(),
    cost_price: numericStringOrNumber.refine((val) => val >= 0, {
        message: 'سعر التكلفة يجب أن يكون موجباً',
    }),
    selling_price: numericStringOrNumber.refine((val) => val >= 0, {
        message: 'سعر البيع يجب أن يكون موجباً',
    }),
    min_stock_level: numericStringOrNumber.refine((val) => val >= 0, {
        message: 'الحد الأدنى يجب أن يكون موجباً',
    }),
    stock_quantity: numericStringOrNumber.optional(),
    location: z.string().optional().nullable(),
    unit: z.enum(['piece', 'set']).optional(),
    category: z.string().optional(),
    is_core: z.boolean().optional(),
}).refine(data => data.selling_price >= data.cost_price, {
    message: 'سعر البيع يجب أن يكون أكبر من أو يساوي سعر التكلفة',
    path: ['selling_price'] // Point error to selling price
});

export type ProductFormSchemaContext = z.infer<typeof productFormSchema>;
