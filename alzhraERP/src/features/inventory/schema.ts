import { z } from 'zod';
import { parseNumberFlexible } from '@/core/utils/currencyUtils';

// Helper for numeric inputs that might come from text fields as strings
const numericStringOrNumber = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform(val => {
    if (val === null || val === undefined || val === '') return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    return parseNumberFlexible(val);
  });

export const productFormSchema = z.object({
  name: z
    .string()
    .min(1, 'يجب إدخال اسم الصنف')
    .transform(val => val.trim()),
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
  cost_price: numericStringOrNumber.refine(val => val >= 0, {
    message: 'سعر التكلفة يجب أن يكون 0 أو أكثر',
  }),
  selling_price: numericStringOrNumber.refine(val => val >= 0, {
    message: 'سعر البيع يجب أن يكون 0 أو أكثر',
  }),
  min_stock_level: numericStringOrNumber.refine(val => val >= 0, {
    message: 'الحد الأدنى يجب أن يكون 0 أو أكثر',
  }),
  stock_quantity: numericStringOrNumber.optional(),
  location: z.string().optional().nullable(),
  unit: z
    .union([z.enum(['piece', 'set']), z.string()])
    .optional()
    .default('piece'),
  category: z.string().optional(),
  is_core: z.boolean().optional(),
});

export type ProductFormSchemaContext = z.infer<typeof productFormSchema>;
