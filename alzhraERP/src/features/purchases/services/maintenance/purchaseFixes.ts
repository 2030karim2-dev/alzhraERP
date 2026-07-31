import { supabase } from '../../../../lib/supabaseClient';
import { accountsService } from '../../../accounting/services/accountsService';

export const purchaseFixesService = {
    /**
     * Fix Script: Correct old Cash Purchase entries that wrongly credited the Supplier account.
     * For each cash invoice, creates a corrective journal entry:
     *   Dr Supplier (2201) — removes the liability
     *   Cr Cash (1010)    — records the actual cash payment
     */
    fixMissingCashPayments: async (companyId: string, userId: string) => {
        try {
            console.info('Starting Fix for Incorrect Cash Purchase Entries...');

            // 1. Get all Cash Purchases
            const { data: invoices, error } = await (supabase.from('invoices') as any)
                .select('*')
                .eq('company_id', companyId)
                .eq('type', 'purchase')
                .eq('payment_method', 'cash');

            if (error) throw error;
            if (!invoices || invoices.length === 0) {
                console.info('No cash invoices found.');
                return { count: 0, message: 'No cash invoices found' };
            }

            console.info(`Found ${invoices.length} cash invoices. Checking for incorrect supplier entries...`);

            // 2. Get necessary accounts
            const accounts = await accountsService.getAccounts(companyId);
            const cashAccount = accounts.find(a => a.code === '1010') ||
                accounts.find(a => a.type === 'asset' && a.name.includes('صندوق'));

            if (!cashAccount) throw new Error('Cash account (1010) not found');

            const supplierAccount = accounts.find(a => a.code === '2201') ||
                accounts.find(a => a.name.includes('موردين')) ||
                accounts.find(a => a.type === 'liability');

            if (!supplierAccount) throw new Error('Supplier account (2201) not found');

            let fixedCount = 0;

            // 3. For each cash invoice, check if supplier account was credited
            for (const invoice of invoices) {
                // Find journal lines that credit the supplier account for this invoice
                const { data: supplierCredits } = await (supabase.from('journal_entry_lines') as any)
                    .select(`
                        id, credit_amount, description,
                        journal:journal_entry_id(id, entry_date, description, status, company_id)
                    `)
                    .eq('account_id', supplierAccount.id)
                    .gt('credit_amount', 0)
                    .like('description', `%${invoice.invoice_number}%`);

                if (!supplierCredits || supplierCredits.length === 0) {
                    console.info(`Invoice #${invoice.invoice_number} — no supplier credit found (already correct)`);
                    continue;
                }

                // Check if a corrective entry already exists (debit on supplier for same invoice)
                const { data: existingCorrection } = await (supabase.from('journal_entry_lines') as any)
                    .select('id')
                    .eq('account_id', supplierAccount.id)
                    .gt('debit_amount', 0)
                    .like('description', `%تصحيح%${invoice.invoice_number}%`);

                if (existingCorrection && existingCorrection.length > 0) {
                    console.info(`Invoice #${invoice.invoice_number} — corrective entry already exists, skipping`);
                    continue;
                }

                const creditAmount = supplierCredits[0].credit_amount;
                console.info(`Invoice #${invoice.invoice_number} — creating corrective entry for SAR ${creditAmount}`);

                // Create corrective journal entry: Dr Supplier / Cr Cash
                const { data: journal, error: jError } = await (supabase.from('journal_entries') as any)
                    .insert({
                        company_id: companyId,
                        entry_date: invoice.issue_date,
                        description: `تصحيح فاتورة مشتريات نقدية #${invoice.invoice_number} — نقل من ذمم الموردين إلى الصندوق`,
                        status: 'posted',
                        created_by: userId,
                        reference_type: 'correction'
                    })
                    .select()
                    .single();

                if (jError) {
                    console.error(`Error creating corrective journal for #${invoice.invoice_number}:`, jError);
                    continue;
                }

                const { error: lError } = await (supabase.from('journal_entry_lines') as any)
                    .insert([
                        {
                            journal_entry_id: journal.id,
                            account_id: supplierAccount.id,
                            debit_amount: creditAmount,
                            credit_amount: 0,
                            description: `تصحيح: إلغاء ذمة مورد — فاتورة نقدية #${invoice.invoice_number}`
                        },
                        {
                            journal_entry_id: journal.id,
                            account_id: cashAccount.id,
                            debit_amount: 0,
                            credit_amount: creditAmount,
                            description: `تصحيح: سداد نقدي فاتورة #${invoice.invoice_number}`
                        }
                    ]);

                if (lError) {
                    console.error(`Error creating corrective lines for #${invoice.invoice_number}:`, lError);
                    // Rollback header
                    await (supabase.from('journal_entries') as any).delete().eq('id', journal.id);
                    continue;
                }

                console.info(`Corrective entry created for Invoice #${invoice.invoice_number}`);
                fixedCount++;
            }

            console.info(`Fix Complete. Created ${fixedCount} corrective entries.`);
            return { count: fixedCount, message: `تم تصحيح ${fixedCount} فاتورة مشتريات نقدية` };

        } catch (error) {
            console.error('Error in fixMissingCashPayments:', error);
            throw error;
        }
    },

    /**
     * Fix Script: Remove Duplicate Journal Entries for Purchases
     * Finds cases where multiple Journal Entries exist for the same Invoice Number (excluding corrections).
     * Keeps the EARLIEST entry (likely the RPC one) and deletes the others.
     */
    removeDuplicatePurchaseEntries: async (companyId: string) => {
        try {
            console.info('Starting Duplicate Cleanup...');
            let deletedCount = 0;

            // 1. Get all invoices to check against
            const { data: invoices } = await (supabase.from('invoices') as any)
                .select('invoice_number')
                .eq('company_id', companyId)
                .eq('type', 'purchase');

            if (!invoices) return { count: 0, message: 'No invoices found' };

            // 2. Iterate and check for duplicates
            for (const inv of invoices) {
                // Find all Journals that mention this invoice # in description
                // and are NOT corrections (reference_type != correction)
                const { data: journals } = await (supabase.from('journal_entries') as any)
                    .select('id, entry_date, created_at, description')
                    .eq('company_id', companyId)
                    .neq('reference_type', 'correction')
                    .like('description', `%${inv.invoice_number}%`)
                    .order('created_at', { ascending: true }); // Oldest first

                if (journals && journals.length > 1) {
                    console.info(`Found ${journals.length} entries for Invoice #${inv.invoice_number}`);

                    // Keep the first one (index 0), delete the rest
                    const toDelete = journals.slice(1);

                    for (const dup of toDelete) {
                        console.info(`Deleting Duplicate Journal: ${dup.id} - ${dup.description}`);
                        // Delete lines first (cascade usually handles this, but being safe)
                        await (supabase.from('journal_entry_lines') as any).delete().eq('journal_entry_id', dup.id);
                        // Delete header
                        await (supabase.from('journal_entries') as any).delete().eq('id', dup.id);
                        deletedCount++;
                    }
                }
            }

            console.info(`Cleanup Complete. Removed ${deletedCount} duplicate entries.`);
            return { count: deletedCount, message: `تم حذف ${deletedCount} قيد مكرر بنجاح` };

        } catch (error) {
            console.error('Error in removeDuplicatePurchaseEntries:', error);
            throw error;
        }
    }
};
