import { supabase } from '../../../../lib/supabaseClient';
import { accountsService } from '../../../accounting/services/accountsService';
import type { Database } from '../../../../core/database.types';

type DisplayValue = string | number | null;
type CashPurchaseInvoice = Pick<Database['public']['Tables']['invoices']['Row'], 'invoice_number' | 'issue_date'>;
type Account = Awaited<ReturnType<typeof accountsService.getAccounts>>[number];
interface FixContext {
    invoice: CashPurchaseInvoice;
    supplierAccount: Account;
    cashAccount: Account;
    companyId: string;
    userId: string;
}

const display = (value: DisplayValue): string => value === null ? '' : String(value);

const findAccount = (accounts: Account[], code: string, name: string, type: string): Account | undefined =>
    accounts.find(account => account.code === code) ?? accounts.find(account => account.name.includes(name)) ?? accounts.find(account => account.type === type);

const createCorrection = async (context: FixContext, creditAmount: number): Promise<boolean> => {
    const { invoice, supplierAccount, cashAccount, companyId, userId } = context;
    const { data: latestJournal } = await supabase.from('journal_entries')
        .select('entry_number')
        .eq('company_id', companyId)
        .order('entry_number', { ascending: false })
        .limit(1)
        .maybeSingle();
    const entryNumber = (latestJournal?.entry_number ?? 1000) + 1;
    const { data: journal, error: journalError } = await supabase.from('journal_entries').insert({
        company_id: companyId,
        entry_number: entryNumber,
        entry_date: invoice.issue_date,
        description: `تصحيح فاتورة مشتريات نقدية #${display(invoice.invoice_number)} — نقل من ذمم الموردين إلى الصندوق`,
        status: 'posted',
        created_by: userId,
        reference_type: 'correction',
    }).select().single();

    if (journalError) {
        console.error(`Error creating corrective journal for #${display(invoice.invoice_number)}:`, journalError);
        return false;
    }

    const { error: lineError } = await supabase.from('journal_entry_lines').insert([
        { journal_entry_id: journal.id, company_id: companyId, account_id: supplierAccount.id, debit_amount: creditAmount, credit_amount: 0, description: `تصحيح: إلغاء ذمة مورد — فاتورة نقدية #${display(invoice.invoice_number)}` },
        { journal_entry_id: journal.id, company_id: companyId, account_id: cashAccount.id, debit_amount: 0, credit_amount: creditAmount, description: `تصحيح: سداد نقدي فاتورة #${display(invoice.invoice_number)}` },
    ]);

    if (lineError) {
        console.error(`Error creating corrective lines for #${display(invoice.invoice_number)}:`, lineError);
        await supabase.from('journal_entries').delete().eq('id', journal.id);
        return false;
    }

    console.info(`Corrective entry created for Invoice #${display(invoice.invoice_number)}`);
    return true;
};

const fixCashInvoice = async (context: FixContext): Promise<boolean> => {
    const { invoice, supplierAccount } = context;
    const { data: supplierCreditsData } = await supabase.from('journal_entry_lines')
        .select('id, credit_amount, description, journal:journal_entry_id(id, entry_date, description, status, company_id)')
        .eq('account_id', supplierAccount.id).gt('credit_amount', 0)
        .like('description', `%${display(invoice.invoice_number)}%`);

    const supplierCredits = supplierCreditsData ?? [];
    if (supplierCredits.length === 0) {
        console.info(`Invoice #${display(invoice.invoice_number)} — no supplier credit found (already correct)`);
        return false;
    }

    const { data: existingCorrectionData } = await supabase.from('journal_entry_lines').select('id')
        .eq('account_id', supplierAccount.id).gt('debit_amount', 0)
        .like('description', `%تصحيح%${display(invoice.invoice_number)}%`);
    const existingCorrection = existingCorrectionData ?? [];
    if (existingCorrection.length > 0) {
        console.info(`Invoice #${display(invoice.invoice_number)} — corrective entry already exists, skipping`);
        return false;
    }

    const creditAmount = supplierCredits[0].credit_amount;
    console.info(`Invoice #${display(invoice.invoice_number)} — creating corrective entry for SAR ${display(creditAmount)}`);
    return createCorrection(context, creditAmount);
};

const fixMissingCashPayments = async (companyId: string, userId: string): Promise<{ count: number; message: string }> => {
    console.info('Starting Fix for Incorrect Cash Purchase Entries...');
    const { data: invoicesData, error } = await supabase.from('invoices').select('invoice_number, issue_date')
        .eq('company_id', companyId).eq('type', 'purchase').eq('payment_method', 'cash');
    if (error) throw error;
    const invoices = invoicesData;
    if (invoices.length === 0) return { count: 0, message: 'No cash invoices found' };

    console.info(`Found ${display(invoices.length)} cash invoices. Checking for incorrect supplier entries...`);
    const accounts = await accountsService.getAccounts(companyId);
    const cashAccount = findAccount(accounts, '1010', 'صندوق', 'asset');
    const supplierAccount = findAccount(accounts, '2201', 'موردين', 'liability');
    if (cashAccount === undefined) throw new Error('Cash account (1010) not found');
    if (supplierAccount === undefined) throw new Error('Supplier account (2201) not found');

    let fixedCount = 0;
    for (const invoice of invoices) {
        const fixed = await fixCashInvoice({ invoice, supplierAccount, cashAccount, companyId, userId });
        if (fixed) fixedCount += 1;
    }
    console.info(`Fix Complete. Created ${display(fixedCount)} corrective entries.`);
    return { count: fixedCount, message: `تم تصحيح ${display(fixedCount)} فاتورة مشتريات نقدية` };
};

const removeDuplicatePurchaseEntries = async (companyId: string): Promise<{ count: number; message: string }> => {
    console.info('Starting Duplicate Cleanup...');
    let deletedCount = 0;
    const { data: invoicesData } = await supabase.from('invoices').select('invoice_number').eq('company_id', companyId).eq('type', 'purchase');
    const invoices = invoicesData ?? [];
    for (const invoice of invoices) {
        const { data: journalsData } = await supabase.from('journal_entries').select('id, entry_date, created_at, description')
            .eq('company_id', companyId).neq('reference_type', 'correction')
            .like('description', `%${display(invoice.invoice_number)}%`).order('created_at', { ascending: true });
        const journals = journalsData ?? [];
        for (const duplicate of journals.slice(1)) {
            console.info(`Deleting Duplicate Journal: ${display(duplicate.id)} - ${display(duplicate.description)}`);
            await supabase.from('journal_entry_lines').delete().eq('journal_entry_id', duplicate.id);
            await supabase.from('journal_entries').delete().eq('id', duplicate.id);
            deletedCount += 1;
        }
    }
    console.info(`Cleanup Complete. Removed ${display(deletedCount)} duplicate entries.`);
    return { count: deletedCount, message: `تم حذف ${display(deletedCount)} قيد مكرر بنجاح` };
};

export const purchaseFixesService = { fixMissingCashPayments, removeDuplicatePurchaseEntries };
