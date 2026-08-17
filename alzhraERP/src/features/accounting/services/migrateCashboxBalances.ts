import { supabase } from '../../../lib/supabaseClient';

/**
 * نقل رصيد الصندوق الرئيسي (1010) إلى صندوق الكاش السعودي (101001).
 *
 * الملاحظة الحرجة: الإصدار القديم كان يعدّل account_id في journal_entry_lines
 * مباشرةً — وهذا محظور في قاعدة البيانات الحية بمحفزات عدم قابلية تعديل القيود
 * المرحلة (trg_journal_entry_lines_immutability) ويشوّه السجل التاريخي.
 * الحل الصحيح: ترحيل قيد تحويل محاسبي متوازن (مدين صندوق السعودي / دائن الرئيسي)
 * عبر RPC المنصوص عليه في post_manual_journal.
 */
export const migrateCashboxBalances = async (companyId: string, userId: string) => {
    // 1. الصندوق الرئيسي (1010)
    const { data: mainCashbox, error: err1 } = await supabase
        .from('accounts')
        .select('id')
        .eq('company_id', companyId)
        .eq('code', '1010')
        .is('deleted_at', null)
        .single();

    if (err1 || !mainCashbox) throw new Error("لم يتم العثور على الصندوق الرئيسي");

    // 2. صندوق الكاش السعودي (طفل 1010 بعملة SAR)
    const { data: sarCashbox, error: err2 } = await supabase
        .from('accounts')
        .select('id')
        .eq('company_id', companyId)
        .eq('parent_id', mainCashbox.id)
        .eq('currency_code', 'SAR')
        .is('deleted_at', null)
        .single();

    if (err2 || !sarCashbox) throw new Error("لم يتم العثور على صندوق الكاش السعودي. قم بتقسيم الصندوق أولاً.");

    // 3. الرصيد الحالي للصندوق الرئيسي (من ميزان المراجعة)
    const { data: balanceRows, error: balanceError } = await supabase.rpc('report_trial_balance', {
        p_company_id: companyId,
        p_from: `${new Date().getFullYear()}-01-01`,
        p_to: new Date().toISOString().split('T')[0]
    });
    if (balanceError) throw balanceError;

    const mainBalance = (balanceRows ?? []).find((row) => row.account_id === mainCashbox.id)?.balance ?? 0;
    if (mainBalance === 0) {
        return { message: "لا يوجد رصيد لنقله في الصندوق الرئيسي." };
    }

    // 4. قيد تحويل متوازن (يدعم الرصيد المدين والدائن)
    const amount = Math.abs(mainBalance);
    const isDebitBalance = mainBalance > 0;
    const { error: postError } = await supabase.rpc('post_manual_journal', {
        p_company_id: companyId,
        p_user_id: userId,
        p_date: new Date().toISOString().split('T')[0],
        p_description: 'نقل رصيد الصندوق الرئيسي إلى صندوق الكاش السعودي',
        p_reference_type: 'cashbox_split',
        p_currency_code: 'SAR',
        p_exchange_rate: 1,
        p_lines: [
            {
                account_id: sarCashbox.id,
                debit: isDebitBalance ? amount : 0,
                credit: isDebitBalance ? 0 : amount,
                description: 'نقل رصيد الكاش - السعودي'
            },
            {
                account_id: mainCashbox.id,
                debit: isDebitBalance ? 0 : amount,
                credit: isDebitBalance ? amount : 0,
                description: 'نقل رصيد الكاش - من الصندوق الرئيسي'
            }
        ]
    });
    if (postError) throw new Error("فشل في ترحيل قيد التحويل: " + postError.message);

    return { message: "تم نقل رصيد الصندوق الرئيسي إلى صندوق الكاش السعودي عبر قيد محاسبي متوازن." };
};
