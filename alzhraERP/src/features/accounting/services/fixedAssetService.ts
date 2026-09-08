import { supabase } from '../../../lib/supabaseClient';
import { parseError } from '../../../core/utils/errorUtils';
import { formatLocalDate } from '../../../core/utils/dateUtils';

export interface FixedAsset {
  id: string;
  company_id: string;
  branch_id?: string | null;
  name: string;
  asset_code: string;
  category: string;
  purchase_date: string;
  purchase_cost: number;
  salvage_value: number;
  useful_life_months: number;
  depreciation_method: string;
  asset_account_id: string;
  accumulated_depr_account_id: string;
  depreciation_expense_account_id: string;
  last_depreciation_date: string | null;
  total_depreciated: number;
  status: 'active' | 'fully_depreciated' | 'disposed';
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFixedAssetInput {
  name: string;
  asset_code: string;
  category: string;
  purchase_date: string;
  purchase_cost: number;
  salvage_value?: number;
  useful_life_months: number;
  notes?: string;
}

export const fixedAssetService = {
  getAssets: async (companyId: string): Promise<FixedAsset[]> => {
    const { data, error } = await (supabase.from as any)('fixed_assets')
      .select('*')
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw parseError(error);
    return (data as FixedAsset[]) ?? [];
  },

  createAsset: async (companyId: string, input: CreateFixedAssetInput): Promise<FixedAsset> => {
    // Find system accounts for company (1300, 1390, 5700)
    const { data: accounts, error: accError } = await supabase
      .from('accounts')
      .select('id, code')
      .eq('company_id', companyId)
      .in('code', ['1300', '1390', '5700']);

    if (accError) throw parseError(accError);

    const assetAcc = accounts?.find(a => a.code === '1300');
    const accumAcc = accounts?.find(a => a.code === '1390');
    const expAcc = accounts?.find(a => a.code === '5700');

    if (!assetAcc || !accumAcc || !expAcc) {
      throw new Error(
        'حسابات الأصول الثابتة أو الإهلاك غير متوفرة في شجرة الحسابات (1300, 1390, 5700)'
      );
    }

    const { data, error } = await (supabase.from as any)('fixed_assets')
      .insert({
        company_id: companyId,
        name: input.name,
        asset_code: input.asset_code,
        category: input.category || 'equipment',
        purchase_date: input.purchase_date,
        purchase_cost: input.purchase_cost,
        salvage_value: input.salvage_value ?? 0,
        useful_life_months: input.useful_life_months,
        asset_account_id: assetAcc.id,
        accumulated_depr_account_id: accumAcc.id,
        depreciation_expense_account_id: expAcc.id,
        notes: input.notes,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw parseError(error);
    return data as FixedAsset;
  },

  postAssetDepreciation: async (assetId: string, periodDate?: string) => {
    const { data, error } = await (supabase.rpc as any)('fn_post_asset_depreciation', {
      p_asset_id: assetId,
      p_period_date: periodDate || formatLocalDate(new Date()),
    });

    if (error) throw parseError(error);
    return data;
  },

  runAllAssetsDepreciation: async (companyId: string, periodDate?: string) => {
    const { data, error } = await (supabase.rpc as any)('fn_run_all_assets_depreciation', {
      p_company_id: companyId,
      p_period_date: periodDate || formatLocalDate(new Date()),
    });

    if (error) throw parseError(error);
    return data;
  },
};
