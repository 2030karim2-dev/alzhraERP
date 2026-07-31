
import { journalEntrySchema } from '../../validators';
import { journalsApi } from '../../../features/accounting/api/journalsApi';

export class PostTransactionUsecase {
  static async execute(data: any, companyId: string, userId: string) {
    // 1. التحقق من صحة البيانات (Client-Side Validation)
    const validatedData = journalEntrySchema.parse(data);

    // 2. الترحيل عبر المحرك المركزي (Server-Side Execution)
    // نستخدم RPC الآن بدلاً من الإدخال المباشر لضمان الـ Atomicity
    const journalId = await journalsApi.postJournalEntryRPC(
        companyId, 
        userId, 
        {
            date: validatedData.date,
            description: validatedData.description,
            lines: validatedData.lines.map((line: any) => ({
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
