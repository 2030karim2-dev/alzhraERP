import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin');
  let allowedOrigin = 'https://alzhra-smart.vercel.app'; // Default safe origin

  if (origin) {
    if (
      origin.startsWith('http://localhost') ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.netlify.app')
    ) {
      allowedOrigin = origin;
    }
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, x-application-name',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 1. Initialize user client to verify who is making the request
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request body
    const bodyText = await req.text();
    if (!bodyText) {
      return new Response(JSON.stringify({ error: 'Request body is empty' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { email, role, company_id, branch_id } = JSON.parse(bodyText);

    if (!email || !role || !company_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 3. Verify permissions (Is user admin or manager?)
    const { data: userRoleData, error: roleError } = await userSupabase
      .from('user_company_roles')
      .select('role, branch_id')
      .eq('company_id', company_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleError || !userRoleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: You do not belong to this company' }),
        {
          status: 403,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    const callerRole = userRoleData.role;
    const callerBranch = userRoleData.branch_id;

    if (!['owner', 'admin', 'manager'].includes(callerRole)) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only owners, admins, and managers can invite' }),
        {
          status: 403,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    if (callerBranch) {
      // Users assigned to a branch can ONLY invite to their own branch
      if (branch_id !== callerBranch) {
        return new Response(
          JSON.stringify({
            error: 'Forbidden: Branch managers can only invite users to their own branch',
          }),
          {
            status: 403,
            headers: { ...cors, 'Content-Type': 'application/json' },
          }
        );
      }
      // Branch managers cannot grant owner role
      if (['owner', 'admin'].includes(role) && callerRole !== 'owner') {
        return new Response(
          JSON.stringify({
            error:
              'Forbidden: Branch managers can only invite branch staff (manager, accountant, sales, viewer, cashier)',
          }),
          {
            status: 403,
            headers: { ...cors, 'Content-Type': 'application/json' },
          }
        );
      }
    }

    // 4. Send the actual invitation via Supabase Auth Admin API
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: inviteData, error: inviteError } =
      await adminSupabase.auth.admin.inviteUserByEmail(email, {
        data: {
          role: role,
          company_id: company_id,
          branch_id: branch_id || null,
        },
      });

    if (inviteError) {
      console.error('Error sending invite:', inviteError);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 5. Insert the record into the 'invitations' table so it shows up in the UI
    const { data: dbInviteData, error: dbInsertError } = await adminSupabase
      .from('invitations')
      .insert({
        email: email,
        role: role,
        company_id: company_id,
        branch_id: branch_id || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (dbInsertError) {
      console.error('Error inserting invitation record:', dbInsertError);
      return new Response(
        JSON.stringify({ error: 'Invitation sent, but failed to record in database' }),
        {
          status: 500,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify(dbInviteData), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Unexpected error:', e);
    const errorMsg = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
