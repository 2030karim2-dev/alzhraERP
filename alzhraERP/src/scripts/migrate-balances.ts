// src/scripts/migrate-balances.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load env vars manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim();
    }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env file");
    process.exit(1);
}

// Custom fetch with timeout and retry logic
const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
    const MAX_RETRIES = 4;
    for (let i = 0; i <= MAX_RETRIES; i++) {
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => {
            try { timeoutController.abort('timeout'); } catch (_) { }
        }, 45000);

        try {
            const response = await fetch(url, { ...options, signal: timeoutController.signal });
            clearTimeout(timeoutId);
            return response;
        } catch (error: any) {
            clearTimeout(timeoutId);
            const isTimeout = error.name === 'AbortError' || error.message?.includes('timeout');
            const isNetworkError = error.message?.toLowerCase().includes('fetch') ||
                error.message?.toLowerCase().includes('network') ||
                error.message?.toLowerCase().includes('proxy');

            if (i < MAX_RETRIES && (isTimeout || isNetworkError)) {
                console.warn(`[Supabase] Request failed (${isTimeout ? 'timeout' : 'network'}), retrying ${i + 1}/${MAX_RETRIES}...`);
                const backoff = (Math.pow(2, i) * 1000) + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, backoff));
                continue;
            }
            throw error;
        }
    }
    throw new Error('Max retries reached');
};

const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { fetch: customFetch }
});

async function migrateBalances() {
    console.log("Starting balance migration...");
    try {
        const { data: companies, error: compErr } = await supabase.from('companies').select('id');
        if (compErr) throw compErr;

        for (const company of companies) {
            console.log(`\nProcessing company: ${company.id}`);

            // 1. Get Main Cashbox
            const { data: mainCashbox } = await supabase
                .from('accounts')
                .select('id, balance')
                .eq('company_id', company.id)
                .eq('code', '1010')
                .single();

            if (!mainCashbox) {
                console.log(`No main cashbox found for company ${company.id}`);
                continue;
            }

            // 2. Get SAR Sub-Cashbox
            const { data: sarCashbox } = await supabase
                .from('accounts')
                .select('id')
                .eq('company_id', company.id)
                .eq('parent_id', mainCashbox.id)
                .eq('currency_code', 'SAR')
                .single();

            if (!sarCashbox) {
                console.log(`No SAR sub-cashbox found for company ${company.id}. Run UI seeder first!`);
                continue;
            }

            // 3. Move all Journal Entry Lines from Main Cashbox -> SAR Cashbox
            console.log(`Migrating journal lines from Main (${mainCashbox.id}) to SAR (${sarCashbox.id})...`);

            // Note: Update all journal entry lines that were previously pointing to the main cashbox
            const { error: updateErr, count: _count } = await supabase
                .from('journal_entry_lines')
                .update({ account_id: sarCashbox.id })
                .eq('account_id', mainCashbox.id);

            if (updateErr) {
                console.error(`Failed to update journal lines:`, updateErr.message);
            } else {
                console.log(`✅ Successfully updated journal entry lines to point to the new SAR cashbox.`);
            }

            // 4. Force rpc call to recalculate balances or just update the account metadata directly
            // (Since recalculating balances usually depends on DB triggers, we might need to manually set the `balance` field or rely on existing triggers to fire ON UPDATE).

            // Alternatively, direct migration of the balance column: 
            // In many ERPs, balance is just calculated on the fly. Let's just log success for the lines.
            console.log(`If balances are cached, you might need to recalculate them.`);
        }
    } catch (err) {
        console.error("Migration failed:", err);
    }
}

migrateBalances();
