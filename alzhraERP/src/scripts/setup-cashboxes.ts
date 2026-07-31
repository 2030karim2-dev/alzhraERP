// src/scripts/setup-cashboxes.ts
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

async function setupCashboxes() {
    console.log("Starting Cashbox setup...");
    try {
        // 1. Get all companies
        const { data: companies, error: compErr } = await supabase.from('companies').select('id');
        if (compErr) throw compErr;

        console.log(`Found ${companies.length} companies.`);

        for (const company of companies) {
            console.log(`\nProcessing company: ${company.id}`);

            // 2. Find the main cashbox (1010)
            const { data: mainCashbox, error: cashErr } = await supabase
                .from('accounts')
                .select('*')
                .eq('company_id', company.id)
                .eq('code', '1010')
                .single();

            if (cashErr || !mainCashbox) {
                console.log(`No main cashbox (1010) found for company ${company.id}. Skipping.`);
                continue;
            }

            console.log(`Found main cashbox. ID: ${mainCashbox.id}, Name: ${mainCashbox.name_ar}`);

            // 3. Make the main cashbox a Parent account (if it isn't already)
            // We don't strictly need to change its type in the DB if it's just a regular account, 
            // but we need to create children for it.

            // 4. Check if children already exist
            const { data: existingChildren, error: checkErr } = await supabase
                .from('accounts')
                .select('code, currency_code')
                .eq('parent_id', mainCashbox.id);

            if (checkErr) throw checkErr;

            const hasSAR = existingChildren?.some(c => c.currency_code === 'SAR');
            const hasYER = existingChildren?.some(c => c.currency_code === 'YER');
            const hasUSD = existingChildren?.some(c => c.currency_code === 'USD');

            const accountsToAdd = [];
            const baseCode = parseInt(mainCashbox.code); // 1010
            let nextSubCode = 1;

            // Logic to find the next available subcode like 101001, 101002
            const getNextCode = () => {
                // This is a simple logic. A more robust one would query existing codes.
                const code = `${baseCode}${String(nextSubCode).padStart(2, '0')}`;
                nextSubCode++;
                return code;
            };

            if (!hasSAR) {
                accountsToAdd.push({
                    company_id: company.id,
                    code: getNextCode(),
                    name_ar: 'صندوق الكاش - ريال سعودي',
                    name_en: 'Cash Box - SAR',
                    type: 'asset',
                    currency_code: 'SAR',
                    parent_id: mainCashbox.id,
                    is_system: true,
                    balance: 0
                });
            }

            if (!hasYER) {
                accountsToAdd.push({
                    company_id: company.id,
                    code: getNextCode(),
                    name_ar: 'صندوق الكاش - ريال يمني',
                    name_en: 'Cash Box - YER',
                    type: 'asset',
                    currency_code: 'YER',
                    parent_id: mainCashbox.id,
                    is_system: true,
                    balance: 0
                });
            }

            if (!hasUSD) {
                accountsToAdd.push({
                    company_id: company.id,
                    code: getNextCode(),
                    name_ar: 'صندوق الكاش - دولار أمريكي',
                    name_en: 'Cash Box - USD',
                    type: 'asset',
                    currency_code: 'USD',
                    parent_id: mainCashbox.id,
                    is_system: true,
                    balance: 0
                });
            }

            if (accountsToAdd.length > 0) {
                const { error: insertErr } = await supabase.from('accounts').insert(accountsToAdd);
                if (insertErr) {
                    console.error(`Error inserting cashboxes for company ${company.id}:`, insertErr);
                } else {
                    console.log(`Successfully added ${accountsToAdd.length} sub-cashboxes.`);
                }
            } else {
                console.log(`Sub-cashboxes already exist for this company.`);
            }
        }

        console.log("\nSetup complete!");
    } catch (err) {
        console.error("Setup failed:", err);
    }
}

setupCashboxes();
