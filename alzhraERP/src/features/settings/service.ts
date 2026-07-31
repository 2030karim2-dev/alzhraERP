import { settingsApi } from './api';
import { CompanyFormData, WarehouseFormData, FiscalYearFormData, ExchangeRateFormData, AutoBackupConfig, BranchFormData } from './types.ts';
import { supabase } from '../../lib/supabaseClient';

export const settingsService = {
    fetchCompany: async (companyId: string) => {
        const { data, error } = await settingsApi.getCompany(companyId);
        if (error) throw error;
        return data;
    },

    updateCompanyProfile: async (companyId: string, data: CompanyFormData) => {
        const { error } = await settingsApi.updateCompany(companyId, data);
        if (error) throw error;
    },

    fetchBranches: async (companyId: string) => {
        const { data, error } = await settingsApi.getBranches(companyId);
        if (error) throw error;
        return data || [];
    },

    addBranch: async (companyId: string, data: BranchFormData) => {
        const { data: branch, error } = await settingsApi.createBranch(companyId, data);
        if (error) throw error;
        return branch;
    },

    updateBranch: async (id: string, data: BranchFormData) => {
        const { data: branch, error } = await settingsApi.updateBranch(id, data);
        if (error) throw error;
        return branch;
    },

    removeBranch: async (id: string) => {
        const { error } = await settingsApi.deleteBranch(id);
        if (error) throw error;
    },

    fetchWarehouses: async (companyId: string) => {
        const { data, error } = await settingsApi.getWarehouses(companyId);
        if (error) throw error;
        return data || [];
    },

    addWarehouse: async (companyId: string, data: WarehouseFormData) => {
        const { data: wh, error } = await settingsApi.createWarehouse(companyId, data);
        if (error) throw error;
        return wh;
    },

    removeWarehouse: async (id: string) => {
        const { error } = await settingsApi.deleteWarehouse(id);
        if (error) throw error;
    },

    updatePrimaryStatus: async (companyId: string, warehouseId: string) => {
        const { error } = await settingsApi.setPrimaryWarehouse(companyId, warehouseId);
        if (error) throw error;
    },

    fetchFiscalYears: async (companyId: string) => {
        const { data, error } = await settingsApi.getFiscalYears(companyId);
        if (error) throw error;
        return data || [];
    },

    addFiscalYear: async (companyId: string, data: FiscalYearFormData) => {
        const { data: fy, error } = await settingsApi.createFiscalYear(companyId, data);
        if (error) throw error;
        return fy;
    },

    closeFiscalYear: async (id: string) => {
        const { error } = await settingsApi.closeFiscalYear(id);
        if (error) throw error;
    },

    fetchCurrencies: async () => {
        const { data, error } = await settingsApi.getSupportedCurrencies();
        if (error) throw error;
        return data || [];
    },

    fetchExchangeRates: async (companyId: string) => {
        const { data, error } = await settingsApi.getExchangeRates(companyId);
        if (error) throw error;
        return data || [];
    },

    setExchangeRate: async (companyId: string, data: ExchangeRateFormData, userId: string) => {
        const { error } = await settingsApi.updateExchangeRate(companyId, data, userId);
        if (error) throw error;
    },

    // LocalStorage helpers for Backup Config (Client preference)
    getAutoBackupConfig: (): AutoBackupConfig => {
        const stored = localStorage.getItem('alz_auto_backup');
        return stored ? JSON.parse(stored) : { enabled: true, frequency: 'daily', retentionDays: 30, includeImages: false, lastBackupStatus: 'idle' };
    },

    saveAutoBackupConfig: (config: AutoBackupConfig) => {
        localStorage.setItem('alz_auto_backup', JSON.stringify(config));
    },

    getStorageStats: () => {
        return {
            totalRecords: 0,
            details: {},
            lastSync: new Date().toISOString(),
            spaceUsed: 'DB Managed',
            spaceLimit: 'Unlimited'
        };
    },

    getBackupLogs: (): { id: string; action: string; size: string; time: string; status: string; icon: string }[] => {
        const logs = localStorage.getItem('alz_backup_logs');
        return logs ? JSON.parse(logs) : [];
    },

    addBackupLog: (action: string, size: string, status: 'Success' | 'Error') => {
        const logs = settingsService.getBackupLogs();
        const newLog = {
            id: Date.now().toString(),
            action,
            size,
            time: new Date().toLocaleString('en-GB'),
            status,
            icon: action.includes('Google') ? 'CloudSync' : 'HardDrive'
        };
        localStorage.setItem('alz_backup_logs', JSON.stringify([newLog, ...logs].slice(0, 10)));
    },

    exportSystemData: async () => {
        const tables = [
            'companies', 'branches', 'warehouses', 'products', 'product_categories',
            'product_stock', 'product_cross_references', 'product_supplier_prices', 'product_kit_items',
            'inventory_transactions', 'stock_transfers', 'stock_transfer_items',
            'parties', 'party_categories',
            'invoices', 'invoice_items',
            'accounts', 'journal_entries', 'journal_entry_lines',
            'fiscal_years', 'supported_currencies', 'exchange_rates',
            'expenses', 'expense_categories'
        ];

        const exportData: Record<string, unknown> = {
            version: '2.0',
            exportedAt: new Date().toISOString(),
            data: {} as Record<string, unknown>
        };

        for (const table of tables) {
            try {
                const tableName = table as keyof import('../../core/database.types').Database['public']['Tables'];
                const { data, error } = await supabase.from(tableName).select('*');
                if (!error && data) {
                    (exportData.data as Record<string, unknown>)[table] = data;
                }
            } catch (err) {
                console.warn(`Failed to export table ${table}:`, err);
            }
        }

        settingsService.addBackupLog('Export Full Data Archive', `${(JSON.stringify(exportData).length / 1024 / 1024).toFixed(2)} MB`, 'Success');
        return exportData;
    },

    importSystemData: async (file: File) => {
        try {
            const text = await file.text();
            const json = JSON.parse(text);

            if (!json.data || !json.version) {
                throw new Error("ملف غير صالح أو تالف");
            }

            // Tables in order of dependencies (roughly)
            const tables = [
                'companies', 'branches', 'warehouses', 'product_categories', 'products',
                'product_stock', 'product_cross_references', 'product_supplier_prices', 'product_kit_items',
                'inventory_transactions', 'stock_transfers', 'stock_transfer_items',
                'party_categories', 'parties',
                'fiscal_years', 'supported_currencies', 'exchange_rates',
                'invoices', 'invoice_items',
                'accounts', 'journal_entries', 'journal_entry_lines',
                'expense_categories', 'expenses'
            ];

            // Warning: This implementation assumes the user wants to upsert/replace.
            // In a production app, we would handle this with extreme care or via a Postgres function.
            for (const table of tables) {
                const tableData = json.data[table];
                if (tableData && Array.isArray(tableData) && tableData.length > 0) {
                    const tableName = table as keyof import('../../core/database.types').Database['public']['Tables'];
                    const { error } = await (supabase.from(tableName) as unknown as { upsert: (data: unknown[], opts: { onConflict: string }) => Promise<{ error: unknown }> }).upsert(tableData, { onConflict: 'id' });
                    if (error) console.error(`Error importing ${table}:`, error);
                }
            }

            settingsService.addBackupLog('System Data Restore', `${(file.size / 1024).toFixed(1)} KB`, 'Success');
            return true;
        } catch (err) {
            settingsService.addBackupLog('System Data Restore', '0 KB', 'Error');
            throw err;
        }
    },

    /**
     * تحديث أسعار الصرف من السوق عبر Edge Function
     */
    refreshMarketRates: async (companyId?: string) => {
        try {
            return await settingsApi.fetchMarketRates(companyId);
        } catch (error) {
            console.error('[Settings] Failed to refresh market rates:', error);
            throw error;
        }
    }
};
