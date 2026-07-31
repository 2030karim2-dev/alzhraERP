import { describe, it, expect, vi, beforeEach } from 'vitest';
import { journalService } from './journalService';
import { journalsApi } from '../api/journalsApi';
import { PostTransactionUsecase } from '../../../core/usecases/accounting/PostTransactionUsecase';

vi.mock('../api/journalsApi', () => ({
    journalsApi: {
        fetchJournals: vi.fn(),
    },
}));

vi.mock('../../../core/usecases/accounting/PostTransactionUsecase', () => ({
    PostTransactionUsecase: {
        execute: vi.fn(),
    },
}));

describe('journalService', () => {
    const mockCompanyId = 'company-123';
    const mockUserId = 'user-456';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createJournal', () => {
        it('should delegate journal creation to PostTransactionUsecase', async () => {
            const mockFormData = {
                date: '2023-10-01',
                description: 'Test entry',
                lines: [
                    { account_id: 'acc1', debit: 100, credit: 0 },
                    { account_id: 'acc2', debit: 0, credit: 100 }
                ]
            } as any;

            const expectedJournalId = 'journal-999';
            (PostTransactionUsecase.execute as any).mockResolvedValue(expectedJournalId);

            const result = await journalService.createJournal(mockFormData, mockCompanyId, mockUserId);

            expect(PostTransactionUsecase.execute).toHaveBeenCalledWith(mockFormData, mockCompanyId, mockUserId);
            expect(result).toBe(expectedJournalId);
        });
    });

    describe('formatJournalsForUI', () => {
        it('should extract party name and calculate total_amount correctly based on cash/bank/receivable/payable accounts', async () => {
            const rawData = [
                {
                    id: 'j-1',
                    company_id: mockCompanyId,
                    entry_number: 1001,
                    entry_date: '2023-10-01',
                    description: 'Sales Invoice',
                    reference_type: 'sales_invoice',
                    reference_id: 'inv-1',
                    status: 'posted',
                    created_at: '2023-10-01T12:00:00Z',
                    created_by: mockUserId,
                    invoice: {
                        party: { name: 'Customer A' }
                    },
                    journal_entry_lines: [
                        {
                            debit_amount: 500,
                            credit_amount: 0,
                            account: { name_ar: 'العملاء', code: '11001' } // Receivables
                        },
                        {
                            debit_amount: 0,
                            credit_amount: 500,
                            account: { name_ar: 'المبيعات', code: '40101' } // Revenue
                        }
                    ]
                }
            ];

            (journalsApi.fetchJournals as any).mockResolvedValue({ data: rawData, error: null });

            const result = await journalService.formatJournalsForUI(mockCompanyId, 0);

            expect(result).toHaveLength(1);

            const formatted = result[0] as any;
            expect(formatted.id).toBe('j-1');
            expect(formatted.total_amount).toBe(500); // Because it matched code 11001
            expect(formatted.party_name).toBe('Customer A'); // extracted from invoice.party
            expect(formatted.journal_entry_lines).toHaveLength(2);
        });

        it('should fallback to max amount if no cash/bank/rec/pay lines exist', async () => {
            const rawData = [
                {
                    id: 'j-2',
                    company_id: mockCompanyId,
                    entry_number: 1002,
                    entry_date: '2023-10-02',
                    description: 'Depreciation',
                    reference_type: 'manual',
                    reference_id: null,
                    status: 'posted',
                    created_at: '2023-10-02T12:00:00Z',
                    created_by: mockUserId,
                    invoice: null,
                    journal_entry_lines: [
                        {
                            debit_amount: 1500,
                            credit_amount: null,
                            account: { name_ar: 'مصروف الإهلاك', code: '50101' }
                        },
                        {
                            debit_amount: null,
                            credit_amount: 1500,
                            account: { name_ar: 'مجمع الإهلاك', code: '20501' } // Not matching the smart total prefixes exactly (101, 102, 110, 210)
                        }
                    ]
                }
            ];

            (journalsApi.fetchJournals as any).mockResolvedValue({ data: rawData, error: null });

            const result = await journalService.formatJournalsForUI(mockCompanyId, 0);

            expect(result).toHaveLength(1);

            const formatted = result[0] as any;
            expect(formatted.id).toBe('j-2');
            expect(formatted.total_amount).toBe(1500); // Fallback to max amount across all lines
        });

        it('should throw error if API fails', async () => {
            const apiError = new Error('Fetch failed');
            (journalsApi.fetchJournals as any).mockResolvedValue({ data: null, error: apiError });

            await expect(journalService.formatJournalsForUI(mockCompanyId, 0)).rejects.toThrow('Fetch failed');
        });
    });
});
