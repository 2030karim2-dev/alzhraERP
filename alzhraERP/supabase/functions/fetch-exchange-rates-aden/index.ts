import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

// Origin allow-list (mirrors ai-proxy). We never echo arbitrary origins — a
// non-listed origin receives SITE_URL instead of being reflected.
const ALLOWED_ORIGINS = [
  'https://zzthamxjxnxzzpswllid.supabase.co',
  'https://alzhra-erp.vercel.app',
  'https://alzhra-erp.netlify.app',
  'https://alzhra-2030karim2-devs-projects.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

const corsHeaders = (req: Request) => {
  const origin = req.headers.get('Origin');
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : (Deno.env.get('SITE_URL') || ALLOWED_ORIGINS[0]);
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
    'Access-Control-Max-Age': '86400',
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders(req) })
  }

  try {
    const { company_id } = await req.json()

    // Here you would typically fetch real market rates from an external API (e.g., Aden Exchange APIs)
    // For now, we return mock data that matches the expected format in the app.
    const mockRates = {
      SAR: { buy: 1.0, sell: 1.0 },
      USD: { buy: 3.75, sell: 3.76 },
      YER: { buy: 0.002, sell: 0.0021 },
    }

    return new Response(
      JSON.stringify(mockRates),
      {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
