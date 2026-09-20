import fs from 'node:fs';

const token = fs.readFileSync(process.env.USERPROFILE + '/.supabase/access-token', 'utf8').trim();
const projectRef = 'zzthamxjxnxzzpswllid';
const COMPANY_ID = 'cd8123f3-3cd4-4310-8b7a-042546c2b09c';

export async function query(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Query failed: ${res.status} ${text}`);
  }
  return res.json();
}

async function main() {
  const branches = await query(`SELECT * FROM public.branches WHERE company_id = '${COMPANY_ID}';`);
  console.log('Branches of Al-Jaafari:', branches);

  // Check all users in Al-Jaafari
  const users = await query(`
    SELECT ucr.user_id, ucr.role, ucr.branch_id, b.name as branch_name, p.email, p.full_name
    FROM public.user_company_roles ucr
    LEFT JOIN public.branches b ON b.id = ucr.branch_id
    LEFT JOIN public.profiles p ON p.id = ucr.user_id
    WHERE ucr.company_id = '${COMPANY_ID}';
  `);
  console.log('Users in Al-Jaafari:', users);
}

main().catch(console.error);
