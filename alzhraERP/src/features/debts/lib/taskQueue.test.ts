import { describe, it, expect } from 'vitest';
import type { DebtTaskQueueRow } from '../types';
import {
  activityIdFromTaskId,
  assignmentPriorityLabel,
  countOverdue,
  sortTasks,
  sumAmountByCurrency,
  taskTypeLabel,
  totalsLabel,
  urgencyClasses,
  urgencyRank,
} from './taskQueue';

const row = (overrides: Partial<DebtTaskQueueRow> = {}): DebtTaskQueueRow => ({
  amount: 100,
  assigned_name: null,
  assigned_to: null,
  currency_code: 'SAR',
  due_at: '2026-09-23T00:00:00Z',
  escalation_stage: 'monitor',
  is_overdue: false,
  party_id: 'p1',
  party_name: 'عميل 1',
  party_phone: '777123456',
  priority: 'medium',
  reference_info: 'INV-1',
  task_id: 'inv:1',
  task_type: 'due_today',
  urgency: 'high',
  ...overrides,
});

describe('taskTypeLabel', () => {
  it('labels every known queue task type', () => {
    expect(taskTypeLabel('due_today')).toBe('مستحق اليوم');
    expect(taskTypeLabel('promise_due')).toBe('وعد مستحق');
    expect(taskTypeLabel('broken_promise')).toBe('وعد مخلَف');
    expect(taskTypeLabel('follow_up')).toBe('إجراء مجدول');
    expect(taskTypeLabel('critical_debt')).toBe('دين حرج');
    expect(taskTypeLabel('failed_message')).toBe('رسالة فاشلة');
  });

  it('passes unknown types through unchanged', () => {
    expect(taskTypeLabel('something_new')).toBe('something_new');
  });
});

describe('urgency', () => {
  it('ranks critical before high before the rest', () => {
    expect(urgencyRank('critical')).toBeLessThan(urgencyRank('high'));
    expect(urgencyRank('high')).toBeLessThan(urgencyRank('medium'));
    expect(urgencyRank(null)).toBe(urgencyRank('low'));
  });

  it('gives critical rows a distinct badge class', () => {
    expect(urgencyClasses('critical')).toContain('rose');
    expect(urgencyClasses('high')).toContain('amber');
    expect(urgencyClasses(null)).toContain('sky');
  });
});

describe('assignmentPriorityLabel', () => {
  it('labels the four assignment priorities', () => {
    expect(assignmentPriorityLabel('urgent')).toBe('عاجلة');
    expect(assignmentPriorityLabel('high')).toBe('عالية');
    expect(assignmentPriorityLabel('low')).toBe('منخفضة');
    expect(assignmentPriorityLabel(null)).toBe('متوسطة');
  });
});

describe('sortTasks', () => {
  it('orders by urgency, then due date, then party name', () => {
    const low = row({
      task_id: 'a',
      urgency: 'medium',
      due_at: '2026-09-20T00:00:00Z',
      party_name: 'ب',
    });
    const highLate = row({ task_id: 'b', urgency: 'high', due_at: '2026-09-25T00:00:00Z' });
    const highEarly = row({ task_id: 'c', urgency: 'high', due_at: '2026-09-21T00:00:00Z' });
    const critical = row({ task_id: 'd', urgency: 'critical', due_at: '2026-09-30T00:00:00Z' });

    expect(sortTasks([low, highLate, highEarly, critical]).map(task => task.task_id)).toEqual([
      'd',
      'c',
      'b',
      'a',
    ]);
  });

  it('does not mutate the input array', () => {
    const tasks = [row({ task_id: 'a' }), row({ task_id: 'b', urgency: 'critical' })];
    const sorted = sortTasks(tasks);
    expect(tasks[0]?.task_id).toBe('a');
    expect(sorted[0]?.task_id).toBe('b');
  });
});

describe('countOverdue', () => {
  it('counts only overdue rows', () => {
    expect(
      countOverdue([
        row({ is_overdue: true }),
        row({ is_overdue: false }),
        row({ is_overdue: true }),
      ])
    ).toBe(2);
  });
});

describe('sumAmountByCurrency', () => {
  it('never mixes currencies and skips null amounts', () => {
    const totals = sumAmountByCurrency([
      row({ amount: 100, currency_code: 'SAR' }),
      row({ amount: 50, currency_code: 'SAR' }),
      row({ amount: 480000, currency_code: 'YER' }),
      row({ amount: null, currency_code: 'SAR' }),
      row({ amount: 10, currency_code: null }),
    ]);

    expect(totals.get('SAR')).toBe(150);
    expect(totals.get('YER')).toBe(480000);
    expect(totals.size).toBe(2);
  });
});

describe('totalsLabel', () => {
  it('returns a dash for empty totals and joins multi-currency labels', () => {
    expect(totalsLabel(new Map())).toBe('—');
    const label = totalsLabel(
      new Map([
        ['SAR', 150],
        ['YER', 480000],
      ])
    );
    // formatCurrency renders the Arabic currency symbol (ر.س/ر.ي), so assert on
    // the amounts and the multi-currency separator instead of the ISO code.
    expect(label).toContain('150');
    expect(label).toContain('480,000');
    expect(label).toContain(' · ');
  });
});
describe('activityIdFromTaskId', () => {
  it('extracts the activity id from a scheduled action task', () => {
    expect(activityIdFromTaskId('act:8f1b')).toBe('8f1b');
  });

  it('returns null for other task kinds and empty ids', () => {
    expect(activityIdFromTaskId('inv:1')).toBeNull();
    expect(activityIdFromTaskId('act:')).toBeNull();
  });
});
