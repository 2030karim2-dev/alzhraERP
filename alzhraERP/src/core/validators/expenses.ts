import { z } from 'zod';

export const expenseCategorySchema = z.object({
  name: z.string().min(2, 'اسم التصنيف مطلوب'),
  description: z.string().optional(),
  is_system: z.boolean().optional(),
});

export const expenseSchema = z.object({
  category_id: z.string().uuid('الرجاء اختيار تصنيف صحيح'),
  voucher_number: z.string().optional().nullable(),
  description: z.string().min(3, 'الوصف مطلوب ويجب أن يكون 3 أحرف على الأقل'),
  amount: z.number({ invalid_type_error: 'المبلغ مطلوب' }).min(0.01, 'المبلغ يجب أن يكون أكبر من 0'),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ غير صحيحة (YYYY-MM-DD)'),
  status: z.enum(['draft', 'posted', 'paid', 'void']).default('draft'),
});

export type ExpenseCategoryFormValues = z.infer<typeof expenseCategorySchema>;
export type ExpenseFormValues = z.infer<typeof expenseSchema>;
