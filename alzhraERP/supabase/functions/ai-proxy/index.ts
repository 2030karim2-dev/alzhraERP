import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { OpenAI } from "https://esm.sh/openai@4.26.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const ALLOWED_ORIGINS = [
  'https://zzthamxjxnxzzpswllid.supabase.co',
  'https://alzhra-erp.vercel.app',
  'https://alzhra-erp.netlify.app',
  'https://alzhra-2030karim2-devs-projects.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

const corsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Max-Age': '86400',
})

// Validate required fields
function validateRequest(body: any) {
  const { prompt, messages } = body;
  if (!prompt && (!messages || messages.length === 0)) {
    return { valid: false, error: 'Missing required field: prompt or messages' };
  }
  if (prompt && typeof prompt !== 'string') {
    return { valid: false, error: 'prompt must be a string' };
  }
  if (messages && !Array.isArray(messages)) {
    return { valid: false, error: 'messages must be an array' };
  }
  return { valid: true };
}

// ── Rate limiting (DB-backed) ───────────────────────────────────────────────
// Limits AI proxy usage per authenticated user so a compromised/abusive token
// cannot drain the company's OpenRouter/DeepSeek balance.
const RATE_LIMIT = { windowMs: 60_000, maxRequests: 10 }; // 10 req / user / minute

async function checkRateLimit(
  userId: string,
  supabaseUrl: string
): Promise<{ allowed: boolean; retryAfterSec?: number }> {
  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      // No admin client available → fail OPEN (never block AI on infra gaps).
      return { allowed: true };
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const since = new Date(Date.now() - RATE_LIMIT.windowMs).toISOString();

    // 1. Record this attempt
    await admin.from('ai_request_log').insert({ user_id: userId });

    // 2. Count requests within the window
    const { count, error } = await admin
      .from('ai_request_log')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);

    if (error) throw error;

    // The count above already includes the request just recorded above.
    const used = count ?? 0;
    if (used > RATE_LIMIT.maxRequests) {
      return { allowed: false, retryAfterSec: Math.ceil(RATE_LIMIT.windowMs / 1000) };
    }

    // 3. Probabilistic cleanup (keep the log table bounded)
    if (Math.random() < 0.01) {
      const cutoff = new Date(Date.now() - RATE_LIMIT.windowMs * 10).toISOString();
      await admin.from('ai_request_log').delete().lt('created_at', cutoff);
    }

    return { allowed: true };
  } catch (e) {
    // Infra failure must never break AI — fail open and log.
    console.error('[RateLimit] check failed (fail-open)', e);
    return { allowed: true };
  }
}

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const headers = corsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    // 1. Verify Authentication using Supabase Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'Unauthorized: Missing Authorization header',
        code: 'AUTH_MISSING'
      }), {
        status: 401,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({
        error: 'Server Error: Supabase configuration missing',
        code: 'CONFIG_ERROR'
      }), {
        status: 500,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized: Invalid token',
        code: 'AUTH_INVALID'
      }), {
        status: 401,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // 1b. Rate limit per user (10 req/min by default)
    const rate = await checkRateLimit(user.id, supabaseUrl);
    if (!rate.allowed) {
      return new Response(JSON.stringify({
        error: 'Rate limit exceeded. Please wait and try again.',
        code: 'RATE_LIMIT',
        retry_after_sec: rate.retryAfterSec
      }), {
        status: 429,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse Request Body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({
        error: 'Invalid JSON in request body',
        code: 'INVALID_BODY'
      }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // 3. Validate Request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        error: validation.error,
        code: 'VALIDATION_ERROR'
      }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    const { prompt, messages, model, systemInstruction, temperature, maxTokens, jsonMode, provider } = body;
    const selectedProvider = provider || 'openrouter';

    // 4. Setup AI Client based on provider
    let apiKey: string | undefined;
    let baseURL: string;
    let defaultHeaders: Record<string, string> = {};

    if (selectedProvider === 'deepseek') {
      apiKey = Deno.env.get("DEEPSEEK_API_KEY");
      if (!apiKey) {
        return new Response(JSON.stringify({
          error: 'Server Error: DEEPSEEK_API_KEY not configured',
          code: 'CONFIG_ERROR'
        }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });
      }
      baseURL = "https://api.deepseek.com/v1";
    } else {
      // Default: OpenRouter
      apiKey = Deno.env.get("OPENROUTER_API_KEY");
      if (!apiKey) {
        return new Response(JSON.stringify({
          error: 'Server Error: OPENROUTER_API_KEY not configured',
          code: 'CONFIG_ERROR'
        }), { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } });
      }
      baseURL = "https://openrouter.ai/api/v1";
      defaultHeaders = {
        "HTTP-Referer": "https://alzhra-erp.vercel.app",
        "X-Title": "Al Zhra ERP Secure Proxy",
      };
    }

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL,
      defaultHeaders,
    });

    // 5. Construct Messages
    const finalMessages = messages || [];
    if (prompt) {
      if (systemInstruction) {
        finalMessages.push({ role: 'system', content: systemInstruction });
      }
      finalMessages.push({ role: 'user', content: prompt });
    }

    // 6. Execute AI Generation with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await openai.chat.completions.create({
        model: model || (selectedProvider === 'deepseek' ? 'deepseek-chat' : "google/gemini-2.5-flash"),
        messages: finalMessages,
        temperature: temperature ?? 0.1,
        max_tokens: maxTokens ?? 1500,
        response_format: jsonMode ? { type: "json_object" } : undefined
      }, { signal: controller.signal });

      clearTimeout(timeoutId);

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Handle specific OpenRouter errors
      if (error.status === 402) {
        return new Response(JSON.stringify({
          error: 'Insufficient funds in OpenRouter account',
          code: 'INSUFFICIENT_FUNDS',
          details: error.message
        }), {
          status: 402,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      if (error.status === 429) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT',
          details: error.message
        }), {
          status: 429,
          headers: { ...headers, 'Content-Type': 'application/json' },
        });
      }

      throw error;
    }

  } catch (error: any) {
    console.error("AI Proxy Error:", error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
})
