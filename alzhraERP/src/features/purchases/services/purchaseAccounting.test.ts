import { describe, it, expect, vi, beforeEach } from 'vitest';
import { purchaseAccountingService } from './purchaseAccounting';
import { logger } from '../../../core/utils/logger';
import type { CreatePurchaseDTO } from '../types';

// ── Mock supabase client ──────────────────────────────────────────────────────
const { mockFrom, mockEq, mockIs, mockLimit } = vi.hoisted(() => {
    const mockLimit = vi.fn();
    const mockIs = vi.fn(() => ({ limit: mockLimit }));
    const mockEq = vi.fn(() => ({ is: mockIs }));
    const mockSelect = vi.fn(() => ({ eq: mockEq }));
    const mockFrom = vi.fn(() => ({ select: mockSelect }));
    return { mockFrom, mockEq, mockIs, mockLimit };
});

vi.mock('../../../lib/supabaseClient', () => ({
    supabase: { from: mockFrom },
}));

const buildDto = (): CreatePurchaseDTO => ({
    supplierId: 'supplier-1',
    invoiceNumber: 'PUR-123',
    items: [],
    issueDate: '2026-08-17',
    status: 'posted',
    paymentMethod: 'cash',
});

describe('purchaseAccountingService.handleNewPurchase', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockLimit.mockResolvedValue({ data: [{ id: 'je-1' }], error: null });
    });

    it('verifies the journal entry exists for the committed invoice', async () => {
        await purchaseAccountingService.handleNewPurchase('inv-1', buildDto(), 'comp-1', 'user-1', 100);

        expect(mockFrom).toHaveBeenCalledWith('journal_entries');
        expect(mockEq).toHaveBeenCalledWith('reference_id', 'inv-1');
        expect(mockIs).toHaveBeenCalledWith('deleted_at', null);
        expect(mockLimit).toHaveBeenCalledWith(1);
    });

    it('does not warn when a journal entry was created by the RPC', async () => {
        const warnSpy = vi.spyOn(logger, 'warn').mockReturnValue(undefined);
        await purchaseAccountingService.handleNewPurchase('inv-1', buildDto(), 'comp-1', 'user-1', 100);

        expect(warnSpy).not.toHaveBeenCalled();
        warnSpy.mockRestore();
    });

    it('warns when the RPC saved the invoice without a journal entry', async () => {
        mockLimit.mockResolvedValue({ data: [], error: null });
        const warnSpy = vi.spyOn(logger, 'warn').mockReturnValue(undefined);
        await purchaseAccountingService.handleNewPurchase('inv-1', buildDto(), 'comp-1', 'user-1', 100);

        expect(warnSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining('No journal entry found'),
            expect.any(Object)
        );
        warnSpy.mockRestore();
    });

    it('never throws when the verification query itself fails', async () => {
        mockLimit.mockResolvedValue({ data: null, error: new Error('network down') });
        const warnSpy = vi.spyOn(logger, 'warn').mockReturnValue(undefined);

        await expect(
            purchaseAccountingService.handleNewPurchase('inv-1', buildDto(), 'comp-1', 'user-1', 100)
        ).resolves.toBeUndefined();

        expect(warnSpy).toHaveBeenCalledWith(
            expect.any(String),
            expect.stringContaining('verification failed'),
            expect.any(Object)
        );
        warnSpy.mockRestore();
    });
});
