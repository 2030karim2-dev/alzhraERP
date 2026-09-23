/**
 * اختبارات أزرار صفوف الديون — بوابات الصلاحيات والترتيب والتفويض.
 * مصدر الأزرار واحد لشبكة الإكسل وبطاقات الموبايل، فأي انحراف هنا يظهر في العرضين.
 */
import { describe, it, expect, vi } from 'vitest';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { buildDebtRowActions, type DebtRowActionHandlers } from './rowActions';
import type { RowAction } from '../components/RowActions';
import type { FollowUpDashboardRow } from '../types';

const makeRow = (partial: Partial<FollowUpDashboardRow> = {}): FollowUpDashboardRow => ({
  party_id: 'p1',
  party_name: 'عميل تجريبي',
  party_phone: '777123456',
  category: 'عام',
  credit_limit: 0,
  currency_code: 'SAR',
  outstanding_balance: 1500.5,
  overdue_amount: 250,
  oldest_due_date: '2026-07-01',
  next_due_date: '2026-09-01',
  days_overdue: 83,
  classification: 'overdue',
  reminder_status: 'needs_reminder',
  last_reminded_at: null,
  last_contact_date: null,
  has_broken_promise: false,
  pending_promise_count: 1,
  pending_promise_amount: 500,
  pending_promise_date: '2026-09-25',
  invoice_count: 2,
  opening_balance: 0,
  ...partial,
});

const makeHandlers = (partial: Partial<DebtRowActionHandlers> = {}): DebtRowActionHandlers => ({
  canManage: false,
  canRemind: false,
  exportingPartyId: null,
  onAiRisk: vi.fn(),
  onExportStatement: vi.fn(),
  onCollect: undefined,
  onTimeline: vi.fn(),
  onPromise: vi.fn(),
  onRemind: vi.fn(),
  ...partial,
});

const keysOf = (handlers: DebtRowActionHandlers): string[] =>
  buildDebtRowActions(makeRow(), handlers).map(action => action.key);

/** ينفّذ زر صف باسمه — ويفشل الاختبار بوضوح إن غاب الزر المتوقع. */
const runAction = (actions: RowAction[], key: string): void => {
  const action = actions.find(candidate => candidate.key === key);
  if (action === undefined) {
    throw new Error(`missing row action: ${key}`);
  }
  action.onAction();
};

describe('buildDebtRowActions — permission gates', () => {
  it('always offers AI analysis, Excel statement and the collection timeline', () => {
    expect(keysOf(makeHandlers())).toEqual(['ai-risk', 'excel-statement', 'timeline']);
  });

  it('adds the WhatsApp reminder only for debts:remind holders', () => {
    const keys = keysOf(makeHandlers({ canRemind: true }));

    expect(keys).toContain('whatsapp-reminder');
    expect(keys.indexOf('whatsapp-reminder')).toBeGreaterThan(keys.indexOf('excel-statement'));
    expect(keys.indexOf('whatsapp-reminder')).toBeLessThan(keys.indexOf('timeline'));
  });

  it('adds collect-now only when debts:manage is granted AND the bond flow is available', () => {
    expect(keysOf(makeHandlers({ canManage: true }))).not.toContain('collect-now');
    expect(keysOf(makeHandlers({ canManage: true, onCollect: vi.fn() }))).toContain('collect-now');
    expect(keysOf(makeHandlers({ onCollect: vi.fn() }))).not.toContain('collect-now');
  });

  it('adds the payment promise only for debts:manage holders', () => {
    expect(keysOf(makeHandlers())).not.toContain('payment-promise');
    expect(keysOf(makeHandlers({ canManage: true }))).toContain('payment-promise');
  });
});

describe('buildDebtRowActions — export idempotency', () => {
  it('disables the statement export and swaps the icon while exporting that party', () => {
    const [ai, exportAction] = buildDebtRowActions(
      makeRow({ party_id: 'p1' }),
      makeHandlers({ exportingPartyId: 'p1' })
    );

    expect(ai.key).toBe('ai-risk');
    expect(exportAction.key).toBe('excel-statement');
    expect(exportAction.disabled).toBe(true);
    expect(exportAction.icon).toBe(Loader2);
  });

  it('keeps the export enabled for other parties', () => {
    const exportAction = buildDebtRowActions(
      makeRow({ party_id: 'p2' }),
      makeHandlers({ exportingPartyId: 'p1' })
    )[1];

    expect(exportAction.disabled).toBe(false);
    expect(exportAction.icon).toBe(FileSpreadsheet);
  });
});

describe('buildDebtRowActions — handler wiring', () => {
  it('forwards the clicked row to the matching handler', () => {
    const row = makeRow({ party_id: 'p9' });
    const handlers = makeHandlers({
      canManage: true,
      canRemind: true,
      onCollect: vi.fn(),
    });
    const actions = buildDebtRowActions(row, handlers);

    runAction(actions, 'ai-risk');
    runAction(actions, 'excel-statement');
    runAction(actions, 'whatsapp-reminder');
    runAction(actions, 'collect-now');
    runAction(actions, 'timeline');
    runAction(actions, 'payment-promise');

    expect(handlers.onAiRisk).toHaveBeenCalledWith(row);
    expect(handlers.onExportStatement).toHaveBeenCalledWith(row);
    expect(handlers.onRemind).toHaveBeenCalledWith(row);
    expect(handlers.onCollect).toHaveBeenCalledWith(row);
    expect(handlers.onTimeline).toHaveBeenCalledWith(row);
    expect(handlers.onPromise).toHaveBeenCalledWith(row);
  });

  it('exposes a label and colour classes for every rendered action', () => {
    const actions = buildDebtRowActions(
      makeRow(),
      makeHandlers({ canManage: true, canRemind: true, onCollect: vi.fn() })
    );

    expect(actions).toHaveLength(6);
    actions.forEach(action => {
      expect(action.label.length).toBeGreaterThan(0);
      expect(action.colorClasses.length).toBeGreaterThan(0);
    });
  });
});
