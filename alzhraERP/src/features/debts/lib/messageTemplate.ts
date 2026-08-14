/**
 * Pure template renderer for debt reminder messages.
 * Supported placeholders: {{customer_name}} {{amount}} {{currency}} {{due_date}}
 * {{days_overdue}} {{invoice_number}} {{company_name}} {{signature}}
 */
import { formatCurrency } from '../../../core/utils/currencyUtils';

export interface ReminderMessageContext {
  customerName?: string | null;
  amount?: number;
  currency?: string;
  dueDate?: string;
  daysOverdue?: number;
  invoiceNumber?: string;
  companyName?: string;
  signature?: string | null;
}

const formatDate = (value?: string): string => {
  if (value === undefined || value === '') return '';
  // Due dates arrive as ISO (YYYY-MM-DD) — keep them stable in messages.
  const iso = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '';
};

export const renderReminderTemplate = (body: string, ctx: ReminderMessageContext): string => {
  const amount =
    ctx.amount !== undefined
      ? formatCurrency(ctx.amount, ctx.currency ?? 'SAR', { maximumFractionDigits: 2 })
      : '';

  return body
    .replace(/\{\{customer_name\}\}/g, ctx.customerName ?? '')
    .replace(/\{\{amount\}\}/g, amount)
    .replace(/\{\{currency\}\}/g, ctx.currency ?? '')
    .replace(/\{\{due_date\}\}/g, formatDate(ctx.dueDate))
    .replace(/\{\{days_overdue\}\}/g, ctx.daysOverdue !== undefined ? String(ctx.daysOverdue) : '')
    .replace(/\{\{invoice_number\}\}/g, ctx.invoiceNumber ?? '')
    .replace(/\{\{company_name\}\}/g, ctx.companyName ?? '')
    .replace(/\{\{signature\}\}/g, ctx.signature ?? '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/** Supported placeholders — shown in the template editor UI. */
export const TEMPLATE_PLACEHOLDERS: Array<{ token: string; label: string }> = [
  { token: '{{customer_name}}', label: 'اسم العميل' },
  { token: '{{amount}}', label: 'المبلغ المستحق' },
  { token: '{{currency}}', label: 'العملة' },
  { token: '{{due_date}}', label: 'تاريخ الاستحقاق' },
  { token: '{{days_overdue}}', label: 'أيام التأخير' },
  { token: '{{invoice_number}}', label: 'رقم الفاتورة' },
  { token: '{{company_name}}', label: 'اسم الشركة' },
  { token: '{{signature}}', label: 'التوقيع' },
];
