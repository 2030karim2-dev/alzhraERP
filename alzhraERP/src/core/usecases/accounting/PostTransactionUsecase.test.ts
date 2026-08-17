import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PostTransactionUsecase } from './PostTransactionUsecase';
import { journalsApi } from '../../../features/accounting/api/journalsApi';

// Mock only the database API calls
vi.mock('../../../features/accounting/api/journalsApi', () => ({
    journalsApi: {
        postJournalEntryRPC: vi.fn(),
    },
}));

describe('PostTransactionUsecase', () => {
    const mockCompanyId = 'company-123';
    const mockUserId = 'user-456';

    const validUUID1 = 'acc10000-0000-0000-0000-000000000001';
    const validUUID2 = 'acc20000-0000-0000-0000-000000000002';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should validate data and post journal entry successfully using real Zod Schema and mapping', async () => {
        const mockInputData = {
            date: '2023-10-01',
            description: 'Test entry description',
            lines: [
                { account_id: validUUID1, debit_amount: 100, credit_amount: 0, description: 'Line 1' },
                { account_id: validUUID2, debit_amount: 0, credit_amount: 100, description: 'Line 2' }
            ]
        };

        const expectedJournalId = 'journal-789';
        (journalsApi.postJournalEntryRPC as any).mockResolvedValue(expectedJournalId);

        // Execute
        const result = await PostTransactionUsecase.execute(mockInputData, mockCompanyId, mockUserId);

        // Assertions
        expect(journalsApi.postJournalEntryRPC).toHaveBeenCalledWith(
            mockCompanyId,
            mockUserId,
            {
                date: mockInputData.date,
                description: mockInputData.description,
                lines: [
                    { account_id: validUUID1, debit: 100, credit: 0, description: 'Line 1' },
                    { account_id: validUUID2, debit: 0, credit: 100, description: 'Line 2' }
                ],
                reference_type: 'manual',
                currency_code: 'SAR',
                exchange_rate: 1
            }
        );
        expect(result).toBe(expectedJournalId);
    });

    it('should throw Zod error if validation fails due to unbalanced entries', async () => {
        const invalidInputData = {
            date: '2023-10-01',
            description: 'Test entry description',
            lines: [
                { account_id: validUUID1, debit_amount: 100, credit_amount: 0 },
                { account_id: validUUID2, debit_amount: 0, credit_amount: 150 } // Unbalanced
            ]
        };

        // Execute and assert
        await expect(PostTransactionUsecase.execute(invalidInputData, mockCompanyId, mockUserId))
            .rejects
            .toThrow();

        // Ensure API is not called if validation fails
        expect(journalsApi.postJournalEntryRPC).not.toHaveBeenCalled();
    });

    it('should throw Zod error if description is missing or date is invalid', async () => {
        const invalidInputData = {
            date: 'invalid-date',
            description: '',
            lines: [
                { account_id: validUUID1, debit_amount: 100, credit_amount: 0 },
                { account_id: validUUID2, debit_amount: 0, credit_amount: 100 }
            ]
        };

        // Execute and assert
        await expect(PostTransactionUsecase.execute(invalidInputData, mockCompanyId, mockUserId))
            .rejects
            .toThrow();

        // Ensure API is not called if validation fails
        expect(journalsApi.postJournalEntryRPC).not.toHaveBeenCalled();
    });

    it('should throw an error if posting to API fails', async () => {
        const mockInputData = {
            date: '2023-10-01',
            description: 'Test entry description',
            lines: [
                { account_id: validUUID1, debit_amount: 100, credit_amount: 0 },
                { account_id: validUUID2, debit_amount: 0, credit_amount: 100 }
            ]
        };

        const apiError = new Error('Database error');
        (journalsApi.postJournalEntryRPC as any).mockRejectedValue(apiError);

        await expect(PostTransactionUsecase.execute(mockInputData, mockCompanyId, mockUserId))
            .rejects
            .toThrow('Database error');
    });

    it('should pass through reference_type when provided', async () => {
        const mockInputData = {
            date: '2023-10-01',
            description: 'Invoice entry',
            reference_type: 'invoice',
            lines: [
                { account_id: validUUID1, debit_amount: 50, credit_amount: 0 },
                { account_id: validUUID2, debit_amount: 0, credit_amount: 50 }
            ]
        };

        (journalsApi.postJournalEntryRPC as any).mockResolvedValue('journal-456');

        await PostTransactionUsecase.execute(mockInputData, mockCompanyId, mockUserId);

        expect(journalsApi.postJournalEntryRPC).toHaveBeenCalledWith(
            mockCompanyId, mockUserId,
            expect.objectContaining({ reference_type: 'invoice' })
        );
    });

    it('should reject single-line entries (minimum 2 required)', async () => {
        const invalidInput = {
            date: '2023-10-01',
            description: 'Single line',
            lines: [
                { account_id: validUUID1, debit_amount: 100, credit_amount: 0 }
            ]
        };

        await expect(PostTransactionUsecase.execute(invalidInput, mockCompanyId, mockUserId))
            .rejects.toThrow();
        expect(journalsApi.postJournalEntryRPC).not.toHaveBeenCalled();
    });

    it('should handle zero-amount lines gracefully via Zod refinement', async () => {
        const invalidInput = {
            date: '2023-10-01',
            description: 'Zero amounts',
            lines: [
                { account_id: validUUID1, debit_amount: 0, credit_amount: 0 },
                { account_id: validUUID2, debit_amount: 0, credit_amount: 0 }
            ]
        };

        await expect(PostTransactionUsecase.execute(invalidInput, mockCompanyId, mockUserId))
            .rejects.toThrow();
    });
});
