import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { OpenAI } from "https://esm.sh/openai@4.26.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
  'Access-Control-Max-Age': '86400',
}

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { prompt, messages, model, systemInstruction, temperature, maxTokens, jsonMode } = body;

    // 4. Setup OpenRouter Client
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'Server Error: OPENROUTER_API_KEY not configured',
        code: 'CONFIG_ERROR'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://alzhra-erp.vercel.app",
        "X-Title": "Al Zhra ERP Secure Proxy",
      }
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
        model: model || "google/gemini-2.5-flash",
        messages: finalMessages,
        temperature: temperature ?? 0.1,
        max_tokens: maxTokens ?? 1500,
        response_format: jsonMode ? { type: "json_object" } : undefined
      }, { signal: controller.signal });

      clearTimeout(timeoutId);

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (error.status === 429) {
        return new Response(JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT',
          details: error.message
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
