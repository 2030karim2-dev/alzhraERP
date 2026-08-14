import { describe, it, expect } from 'vitest';
import { renderReminderTemplate } from './messageTemplate';

describe('renderReminderTemplate', () => {
  const ctx = {
    customerName: 'شركة النور',
    amount: 1500.5,
    currency: 'SAR',
    dueDate: '2026-08-20',
    daysOverdue: 3,
    invoiceNumber: 'INV-100',
    companyName: 'الزهراء',
    signature: 'فريق التحصيل',
  };

  it('replaces all placeholders', () => {
    const body =
      'مرحباً {{customer_name}}، مبلغ {{amount}} {{currency}} مستحق في {{due_date}} (تأخير {{days_overdue}} أيام) فاتورة {{invoice_number}}. {{company_name}} — {{signature}}';
    const out = renderReminderTemplate(body, ctx);
    expect(out).toContain('شركة النور');
    expect(out).toContain('1,500.50');
    expect(out).toContain('2026-08-20');
    expect(out).toContain('3 أيام');
    expect(out).toContain('INV-100');
    expect(out).toContain('الزهراء');
    expect(out).toContain('فريق التحصيل');
    expect(out).not.toContain('{{');
  });

  it('leaves unknown placeholders untouched', () => {
    const out = renderReminderTemplate('نص {{unknown_var}}', ctx);
    expect(out).toBe('نص {{unknown_var}}');
  });

  it('collapses excessive blank lines', () => {
    const out = renderReminderTemplate('سطر 1\n\n\n\n\nسطر 2', ctx);
    expect(out).toBe('سطر 1\n\nسطر 2');
  });

  it('handles missing optional values gracefully', () => {
    const out = renderReminderTemplate('{{customer_name}} {{amount}} {{due_date}}', {});
    // All placeholders resolve to '' and the result is trimmed.
    expect(out).toBe('');
  });
});
