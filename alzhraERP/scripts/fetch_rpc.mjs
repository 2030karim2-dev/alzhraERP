import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const env = fs.readFileSync('.env.local', 'utf-8');
const connectionMatch = env.match(/DATABASE_URL=(.+)/);

let connectionString = '';
if (connectionMatch) {
    connectionString = connectionMatch[1].trim();
} else {
    console.error("Direct DATABASE_URL not found in .env.local.");
    process.exit(1);
}

const sql = `
SELECT pg_get_functiondef(p.oid) as function_def
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'commit_purchase_invoice';
`;

async function run() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query(sql);
        if (res.rows.length > 0) {
            console.log(res.rows[0].function_def);
            fs.writeFileSync('rpc_commit_purchase_invoice.sql', res.rows[0].function_def);
        } else {
            console.log("Function not found");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await client.end();
    }
}

run();
