
import { journalEntrySchema, type JournalEntry } from '../../validators';
import { journalsApi } from '../../../features/accounting/api/journalsApi';

export class PostTransactionUsecase {
  static async execute(data: JournalEntry, companyId: string, userId: string): Promise<string> {
    // 1. التحقق من صحة البيانات (Client-Side Validation)
    const validatedData = journalEntrySchema.parse(data);

    // 2. الترحيل عبر المحرك المركزي (Server-Side Execution)
    const journalId = await journalsApi.postJournalEntryRPC(
        companyId, 
        userId, 
        {
            date: validatedData.date,
            description: validatedData.description,
            lines: validatedData.lines.map((line) => ({
                account_id: line.account_id,
                debit: line.debit_amount,
                credit: line.credit_amount,
                description: line.description
            })),
            reference_type: validatedData.reference_type || 'manual'
        }
    );

    return journalId;
  }
}
