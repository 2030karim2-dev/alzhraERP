import fs from 'fs';
import fetch from 'node-fetch';

const env = fs.readFileSync('.env', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.+)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.+)/);

if (!urlMatch || !keyMatch) {
    console.error("Missing URL or KEY in .env");
    process.exit(1);
}

const url = urlMatch[1].trim();
const key = keyMatch[1].trim();

const tables = [
    'companies', 'profiles', 'accounts', 'invoices', 'products',
    'inventory_transactions', 'journal_entries', 'branches'
];

async function testTable(table) {
    try {
        const res = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
            headers: {
                'apikey': key,
                'Authorization': `Bearer ${key}`
            }
        });
        const data = await res.json();
        const status = res.status;

        if (status === 200 && Array.isArray(data) && data.length > 0) {
            console.log(`[VULNERABILITY] Table ${table} is readable by Anonymous users! Rows returned: ${data.length}`);
        } else if (status === 200 && Array.isArray(data) && data.length === 0) {
            console.log(`[OK] Table ${table} returned 0 rows (RLS active or table empty).`);
        } else {
            console.log(`[SECURE] Table ${table} Anon Read blocked: HTTP ${status} - ${JSON.stringify(data)}`);
        }
    } catch (err) {
        console.error(`Error testing ${table}:`, err.message);
    }
}

async function run() {
    console.log(`Testing Supabase RLS at ${url}...`);
    for (const t of tables) {
        await testTable(t);
    }
}
run();
