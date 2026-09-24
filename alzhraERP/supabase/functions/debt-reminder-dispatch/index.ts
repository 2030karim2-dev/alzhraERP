import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

// ============================================================
// debt-reminder-dispatch - Al-Zahra Smart ERP (S3)
// ============================================================
// Drains public.debt_reminder_queue and sends through the channel each row asks
// for: WhatsApp (Meta Cloud API or CallMeBot) or SMS (generic HTTP gateway).
// Every result is written back through log_debt_reminder_result, which also
// writes the honest debt_message_log row (delivery_status sent/failed).
//
// Callers:
//   * cron_dispatch_debt_reminders() with the service_role key -> all companies
//   * the app with a user JWT + {company_id}                   -> that company only
// ============================================================

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-application-name',
};

const json = (payload: unknown, status = 200): Response =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

type SendResult = { ok: boolean; providerId?: string; error?: string };

const digits = (value: string | null | undefined): string => (value ?? '').replace(/[^0-9]/g, '');

/**
 * Service-role detection that works with both key formats:
 *  - a legacy JWT whose payload role claim is "service_role"
 *  - an opaque secret key equal to the SUPABASE_SERVICE_ROLE_KEY env value
 * (the project is migrating to the sb_secret_/sb_publishable_ key system).
 */
const isServiceCaller = (authHeader: string): boolean => {
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  const envKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (envKey !== '' && token === envKey) return true;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))) as {
      role?: string;
    };
    return payload.role === 'service_role';
  } catch {
    return false;
  }
};

/** WhatsApp: Meta Cloud API endpoint, or CallMeBot when the url points there. */
async function sendWhatsApp(
  url: string | null,
  key: string | null,
  phone: string,
  text: string
): Promise<SendResult> {
  if (!url || !key) return { ok: false, error: 'whatsapp provider not configured' };
  try {
    if (url.includes('api.callmebot.com')) {
      const res = await fetch(
        `${url}?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(key)}`
      );
      return res.ok
        ? { ok: true }
        : { ok: false, error: `callmebot ${res.status}: ${(await res.text()).slice(0, 200)}` };
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      }),
    });
    const body = (await res.json().catch(() => null)) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    } | null;
    if (!res.ok) {
      return { ok: false, error: body?.error?.message ?? `whatsapp ${res.status}` };
    }
    return { ok: true, providerId: body?.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: `whatsapp exception: ${String(err)}` };
  }
}

/** SMS: generic local gateway (POST JSON with the key in the header and body). */
async function sendSms(
  url: string | null,
  key: string | null,
  sender: string | null,
  phone: string,
  text: string
): Promise<SendResult> {
  if (!url || !key) return { ok: false, error: 'sms provider not configured' };
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'X-Api-Key': key,
      },
      body: JSON.stringify({
        to: phone,
        from: sender ?? '',
        sender: sender ?? '',
        message: text,
        text,
        api_key: key,
      }),
    });
    const raw = await res.text();
    if (!res.ok) return { ok: false, error: `sms ${res.status}: ${raw.slice(0, 200)}` };
    let providerId: string | undefined;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      providerId = String(parsed.id ?? parsed.message_id ?? parsed.msgid ?? '') || undefined;
    } catch {
      // plain-text gateways: a 200 with no id
    }
    return { ok: true, providerId };
  } catch (err) {
    return { ok: false, error: `sms exception: ${String(err)}` };
  }
}
interface QueueRow {
  queue_id: string;
  channel: string;
  message_text: string;
  recipient: string | null;
  party_phone: string | null;
  provider_kind: string;
  provider_url: string | null;
  provider_key: string | null;
  provider_sender: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(url, serviceKey);

    const isService = isServiceCaller(authHeader);
    let companyId: string | null = null;
    let limit = 20;

    if (!isService) {
      const userClient = createClient(url, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      if (!userData?.user) return json({ error: 'Unauthorized' }, 401);

      const body = (await req.json().catch(() => ({}))) as {
        company_id?: string;
        limit?: number;
      };
      companyId = typeof body.company_id === 'string' ? body.company_id : null;
      if (!companyId) return json({ error: 'company_id is required' }, 400);

      const { data: role } = await userClient
        .from('user_company_roles')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', userData.user.id)
        .limit(1)
        .maybeSingle();
      const allowed = ['owner', 'admin', 'manager', 'accountant'];
      if (!role || !allowed.includes(String(role.role))) {
        return json({ error: 'Forbidden' }, 403);
      }
      if (typeof body.limit === 'number') {
        limit = Math.min(Math.max(Math.trunc(body.limit), 1), 50);
      }
    }

    const { data, error } = await admin.rpc('claim_debt_reminders', {
      p_limit: limit,
      ...(companyId ? { p_company_id: companyId } : {}),
    });
    if (error) return json({ error: error.message }, 500);

    const rows = (data ?? []) as QueueRow[];
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const row of rows) {
      const recipient = digits(row.recipient) || digits(row.party_phone);

      // Unusable recipient: cancel the row WITHOUT a failure log - a bad phone
      // is not a provider failure and must not pollute the KPIs.
      if (recipient.length < 9) {
        await admin.rpc('release_debt_reminder', {
          p_queue_id: row.queue_id,
          p_reason: 'invalid recipient phone',
          p_cancel: true,
        });
        skipped += 1;
        continue;
      }

      // Channel not configured (yet): keep the row queued so it flows as soon as
      // the owner saves the provider settings - never record a failure.
      if (!row.provider_url || !row.provider_key) {
        await admin.rpc('release_debt_reminder', {
          p_queue_id: row.queue_id,
          p_reason: `${row.provider_kind} provider not configured`,
          p_cancel: false,
        });
        skipped += 1;
        continue;
      }

      const result: SendResult =
        row.provider_kind === 'sms'
          ? await sendSms(
              row.provider_url,
              row.provider_key,
              row.provider_sender,
              recipient,
              row.message_text
            )
          : await sendWhatsApp(row.provider_url, row.provider_key, recipient, row.message_text);

      await admin.rpc('log_debt_reminder_result', {
        p_queue_id: row.queue_id,
        p_success: result.ok,
        ...(result.providerId ? { p_provider_message_id: result.providerId } : {}),
        ...(result.error ? { p_error: result.error } : {}),
        ...(result.ok ? { p_delivery_status: 'sent' } : {}),
      });

      if (result.ok) sent += 1;
      else failed += 1;
    }

    return json({ processed: rows.length, sent, failed, skipped });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
