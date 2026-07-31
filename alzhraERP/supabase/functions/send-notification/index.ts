import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

function getCorsHeaders(req: Request) {
    const origin = req.headers.get('Origin');
    let allowedOrigin = 'https://alzhra-smart.vercel.app'; // Default safe origin

    if (origin) {
        if (origin.startsWith('http://localhost') || origin.endsWith('.vercel.app') || origin.endsWith('.netlify.app')) {
            allowedOrigin = origin;
        }
    }

    return {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
    };
}

interface NotificationRequest {
    company_id: string;
    event_type: string;
    message: string;
    reference_id?: string;
    image_base64?: string; // NEW: base64 PNG for sending images
}

// ---- Telegram: Text ----
async function sendTelegramText(botToken: string, chatId: string, message: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
        });
        const data = await res.json();
        if (!data.ok) return { ok: false, error: data.description || 'Telegram API error' };
        return { ok: true };
    } catch (e) {
        return { ok: false, error: (e as Error).message };
    }
}

// ---- Telegram: Image (Photo) ----
async function sendTelegramPhoto(botToken: string, chatId: string, imageBase64: string, caption: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const url = `https://api.telegram.org/bot${botToken}/sendPhoto`;
        const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
        const blob = new Blob([imageBytes], { type: 'image/png' });

        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', blob, 'invoice.png');
        if (caption) formData.append('caption', caption.substring(0, 1024));

        const res = await fetch(url, { method: 'POST', body: formData });
        const data = await res.json();
        if (!data.ok) return { ok: false, error: data.description || 'Telegram Photo API error' };
        return { ok: true };
    } catch (e) {
        return { ok: false, error: (e as Error).message };
    }
}

// ---- WhatsApp: Text ----
async function sendWhatsAppText(apiUrl: string, apiKey: string, phone: string, message: string): Promise<{ ok: boolean; error?: string }> {
    try {
        if (apiUrl.includes('api.callmebot.com')) {
            const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(message)}&apikey=${encodeURIComponent(apiKey)}`;
            const res = await fetch(url);
            if (!res.ok) return { ok: false, error: `CallMeBot error: ${res.status}` };
            return { ok: true };
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
        let body: Record<string, unknown>;

        if (apiUrl.includes('graph.facebook.com')) {
            body = { messaging_product: 'whatsapp', to: phone, type: 'text', text: { body: message } };
        } else {
            body = { phone, message };
        }

        const res = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!res.ok) {
            const errText = await res.text();
            return { ok: false, error: `WhatsApp API error: ${res.status} - ${errText}` };
        }
        return { ok: true };
    } catch (e) {
        return { ok: false, error: (e as Error).message };
    }
}

// ---- WhatsApp: Image ----
async function sendWhatsAppImage(apiUrl: string, apiKey: string, phone: string, imageBase64: string, caption: string): Promise<{ ok: boolean; error?: string }> {
    try {
        const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));
        const blob = new Blob([imageBytes], { type: 'image/png' });

        if (apiUrl.includes('graph.facebook.com')) {
            // Meta Cloud API: first upload media, then send
            const baseApiUrl = apiUrl.substring(0, apiUrl.lastIndexOf('/messages'));
            const uploadUrl = `${baseApiUrl}/media`;

            const uploadForm = new FormData();
            uploadForm.append('file', blob, 'invoice.png');
            uploadForm.append('type', 'image/png');
            uploadForm.append('messaging_product', 'whatsapp');

            const uploadRes = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${apiKey}` },
                body: uploadForm
            });

            if (!uploadRes.ok) {
                return await sendWhatsAppText(apiUrl, apiKey, phone, caption);
            }

            const uploadData = await uploadRes.json();
            const mediaId = uploadData.id;

            const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
            const body = {
                messaging_product: 'whatsapp',
                to: phone,
                type: 'image',
                image: { id: mediaId, caption: caption.substring(0, 1024) },
            };

            const sendRes = await fetch(apiUrl, { method: 'POST', headers, body: JSON.stringify(body) });
            if (!sendRes.ok) {
                return await sendWhatsAppText(apiUrl, apiKey, phone, caption);
            }
            return { ok: true };
        }

        // Generic API: try multipart
        const formData = new FormData();
        formData.append('phone', phone);
        formData.append('caption', caption);
        formData.append('image', blob, 'invoice.png');

        const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: formData,
        });

        if (!res.ok) {
            return await sendWhatsAppText(apiUrl, apiKey, phone, caption);
        }
        return { ok: true };
    } catch (e) {
        return await sendWhatsAppText(apiUrl, apiKey, phone, caption);
    }
}

Deno.serve(async (req: Request) => {
    const cors = getCorsHeaders(req);
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: cors });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

        // Service client for DB operations bypassing RLS
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
                status: 401,
                headers: { ...cors, 'Content-Type': 'application/json' },
            });
        }

        // User client to run queries under user context
        const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader } }
        });

        const bodyText = await req.text();
        if (!bodyText) {
            return new Response(JSON.stringify({ error: 'Request body is empty' }), {
                status: 400,
                headers: { ...cors, 'Content-Type': 'application/json' },
            });
        }

        const { company_id, event_type, message, reference_id, image_base64 } = JSON.parse(bodyText) as NotificationRequest;

        if (!company_id || !event_type || !message) {
            return new Response(JSON.stringify({ error: 'Missing required fields' }), {
                status: 400,
                headers: { ...cors, 'Content-Type': 'application/json' },
            });
        }

        // Authorization check: Verify user belongs to company_id
        const { data: roleCheck, error: roleError } = await userSupabase
            .from('user_company_roles')
            .select('id')
            .eq('company_id', company_id)
            .limit(1)
            .single();

        if (roleError || !roleCheck) {
            return new Response(JSON.stringify({ error: 'Forbidden: User does not belong to this company' }), {
                status: 403,
                headers: { ...cors, 'Content-Type': 'application/json' },
            });
        }

        // Rate limiting: 60 requests per minute
        const { data: isAllowed, error: rateError } = await supabase.rpc('check_rate_limit', {
            p_company_id: company_id,
            p_endpoint: 'send-notification',
            p_max_requests: 60,
            p_window_seconds: 60
        });

        if (rateError) {
            console.error('Rate limit error:', rateError);
        } else if (isAllowed === false) {
            return new Response(JSON.stringify({ error: 'Too Many Requests: Rate limit exceeded' }), {
                status: 429,
                headers: { ...cors, 'Content-Type': 'application/json', 'Retry-After': '60' },
            });
        }

        // Proceed as normal using service client for configurations and logging
        const { data: config, error: configError } = await supabase
            .from('messaging_config')
            .select('*')
            .eq('company_id', company_id)
            .single();

        if (configError || !config) {
            return new Response(JSON.stringify({ error: 'Messaging not configured for this company' }), {
                status: 404,
                headers: { ...cors, 'Content-Type': 'application/json' },
            });
        }

        const eventToggleMap: Record<string, string> = {
            sale: 'notify_on_sale',
            purchase: 'notify_on_purchase',
            bond: 'notify_on_bond',
            expense: 'notify_on_expense',
            stock_transfer: 'notify_on_stock_transfer',
            low_stock: 'notify_on_low_stock',
        };

        if (event_type !== 'test' && event_type !== 'share') {
            const toggleField = eventToggleMap[event_type];
            if (toggleField && !config[toggleField]) {
                return new Response(JSON.stringify({ message: `Notifications disabled for ${event_type}` }), {
                    status: 200,
                    headers: { ...cors, 'Content-Type': 'application/json' },
                });
            }
        }

        const results: { channel: string; success: boolean; error?: string }[] = [];

        // ===== TELEGRAM =====
        if (config.telegram_enabled && config.telegram_bot_token && config.telegram_chat_id) {
            let telegramResult;
            if (image_base64) {
                telegramResult = await sendTelegramPhoto(config.telegram_bot_token, config.telegram_chat_id, image_base64, message);
            } else {
                telegramResult = await sendTelegramText(config.telegram_bot_token, config.telegram_chat_id, message);
            }
            results.push({ channel: 'telegram', success: telegramResult.ok, error: telegramResult.error });

            await supabase.from('notification_log').insert({
                company_id,
                channel: 'telegram',
                event_type,
                message: image_base64 ? `[IMAGE] ${message.substring(0, 200)}` : message,
                status: telegramResult.ok ? 'sent' : 'failed',
                error_message: telegramResult.error || null,
                reference_id: reference_id || null,
            });
        }

        // ===== WHATSAPP =====
        if (config.whatsapp_enabled && config.whatsapp_api_url && config.whatsapp_phone) {
            let whatsappResult;
            // Also decrypt / or use API key directly (assuming we haven't implemented Vault yet for Phase 2)
            if (image_base64) {
                whatsappResult = await sendWhatsAppImage(config.whatsapp_api_url, config.whatsapp_api_key, config.whatsapp_phone, image_base64, message);
            } else {
                whatsappResult = await sendWhatsAppText(config.whatsapp_api_url, config.whatsapp_api_key, config.whatsapp_phone, message);
            }
            results.push({ channel: 'whatsapp', success: whatsappResult.ok, error: whatsappResult.error });

            await supabase.from('notification_log').insert({
                company_id,
                channel: 'whatsapp',
                event_type,
                message: image_base64 ? `[IMAGE] ${message.substring(0, 200)}` : message,
                status: whatsappResult.ok ? 'sent' : 'failed',
                error_message: whatsappResult.error || null,
                reference_id: reference_id || null,
            });
        }

        if (results.length === 0) {
            return new Response(JSON.stringify({ message: 'No channels enabled' }), {
                status: 200,
                headers: { ...cors, 'Content-Type': 'application/json' },
            });
        }

        return new Response(JSON.stringify({ results }), {
            status: 200,
            headers: { ...cors, 'Content-Type': 'application/json' },
        });
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Unknown error';
        return new Response(JSON.stringify({ error: errorMsg }), {
            status: 500,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    }
});
