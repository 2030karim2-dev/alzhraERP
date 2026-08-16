import { supabase } from '../../../lib/supabaseClient';

export const migrateCashboxBalances = async (companyId: string) => {
    // 1. Get Main Cashbox
    const { data: mainCashbox, error: err1 } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('code', '1010')
        .is('deleted_at', null)
        .single();

    if (err1 || !mainCashbox) throw new Error("لم يتم العثور على الصندوق الرئيسي");

    // 2. Get SAR Sub-Cashbox
    const { data: sarCashbox, error: err2 } = await supabase
        .from('accounts')
        .select('*')
        .eq('company_id', companyId)
        .eq('parent_id', mainCashbox.id!)
        .eq('currency_code', 'SAR')
        .is('deleted_at', null)
        .single();

    if (err2 || !sarCashbox) throw new Error("لم يتم العثور على صندوق الكاش السعودي. قم بتقسيم الصندوق أولاً.");

    const { data: balanceRows, error: balanceError } = await supabase.rpc('report_trial_balance', {
        p_company_id: companyId,
        p_from: `${new Date().getFullYear()}-01-01`,
        p_to: new Date().toISOString().split('T')[0]
    });
    if (balanceError) throw balanceError;

    const mainBalance = balanceRows.find((row) => row.account_id === mainCashbox.id)?.balance ?? 0;
    if (mainBalance === 0) {
        return { message: "لا يوجد رصيد لنقله في الصندوق الرئيسي." };
    }

    // 3. Move all Journal Entry Lines from Main Cashbox -> SAR Cashbox
    const { error: updateErr } = await supabase
        .from('journal_entry_lines')
        .update({ account_id: sarCashbox.id! })
        .eq('account_id', mainCashbox.id!);

    if (updateErr) throw new Error("فشل في تحويل القيود المحاسبية للصندوق الجديد");

    return { message: "تم نقل الأرصدة السابقة إلى صندوق الكاش السعودي بنجاح." };
};
