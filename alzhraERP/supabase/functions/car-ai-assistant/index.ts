import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { OpenAI } from "https://esm.sh/openai@4.26.0"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('SITE_URL') || 'https://zzthamxjxnxzzpswllid.supabase.co',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VehicleInfoArgs {
  year: number;
  make: string;
  model?: string;
}

// ================== Mock Database for open-vehicle-db Logic ==================
// In a real scenario, this would call an external API or use a DB.
// Porting the logic from the user's Python mockup.
async function get_vehicle_info({ year, make, model }: VehicleInfoArgs) {
  console.log(`Searching for: ${year} ${make} ${model || ''}`);
  
  // Realized: The user mentioned 'open-vehicle-db'. 
  // For now, we use a deterministic mock that returns realistic data,
  // consistent with our previous compatibility logic.
  
  const catalog = [
    { make: 'Toyota', models: ['Camry', 'Corolla', 'Hilux', 'Land Cruiser', 'Yaris', 'RAV4', 'Prado'] },
    { make: 'Hyundai', models: ['Elantra', 'Sonata', 'Tucson', 'Accent', 'Santa Fe', 'Creta'] },
    { make: 'Kia', models: ['Optima', 'Sportage', 'Cerato', 'Sorento', 'Rio', 'Carnival'] },
    { make: 'Nissan', models: ['Altima', 'Sunny', 'Patrol', 'Maxima', 'Sentra', 'X-Trail'] },
    { make: 'Ford', models: ['Taurus', 'Explorer', 'F-150', 'Expedition', 'Mustang', 'Edge'] },
  ];

  const makeData = catalog.find(c => c.make.toLowerCase() === make.toLowerCase());
  
  if (!makeData) {
    return { error: `Manufacturer ${make} not found in our current catalog.` };
  }

  if (model) {
    // Return styles/trims (simulation)
    const baseModel = makeData.models.find(m => m.toLowerCase() === model.toLowerCase());
    if (!baseModel) return { error: `Model ${model} not found for ${make}.` };
    
    return {
      year,
      make,
      model,
      styles: [
        `${model} GLI 1.8L Sedan`,
        `${model} Sport 2.0L`,
        `${model} LE 1.6L`,
        `${model} Comfort Plus`
      ],
      total_styles: 4
    };
  } else {
    // Return all models
    return {
      year,
      make,
      models: makeData.models
    };
  }
}

const tools = [
  {
    type: "function",
    function: {
      name: "get_vehicle_info",
      description: "ابحث عن موديلات أو ستايلات سيارة محددة (سنة + ماركة + موديل). ضروري قبل البحث عن قطع الغيار.",
      parameters: {
        type: "object",
        properties: {
          year: {
            type: "integer",
            description: "سنة الصنع (مثال: 2020)"
          },
          make: {
            type: "string",
            description: "الماركة (Toyota, Hyundai, Nissan...)"
          },
          model: {
            type: "string",
            description: "الموديل (مثال: Corolla). اتركه فارغ إذا تبغى كل الموديلات."
          }
        },
        required: ["year", "make"]
      }
    }
  }
]

const systemPrompt = `
أنت مساعد محاسبي ذكي متخصص في قطع غيار السيارات (تويوتا، هيونداي، نيسان، ميتسوبيشي، باجيرو).
- دائماً استخدم أداة get_vehicle_info أولاً لتحديد الموديل أو الستايل الدقيق عند سؤالك عن سيارة.
- استخدم المصطلحات العربية الشائعة (فلتر زيت، تيل فرامل، سير تايمنج...).
- بعد معرفة الستايل، أعطِ توافق مقترح + نصيحة فنية.
- كن ودود وسريع.
- أجب دائماً باللغة العربية.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing Authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { messages } = await req.json()
    const apiKey = Deno.env.get("CAR_AI_API_KEY") || Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'CAR_AI_API_KEY not configured on the server', code: 'CONFIG_ERROR' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openRouterRequest = async (msgs: any[], includeTools = false) => {
      const body: any = {
        model: "google/gemini-2.5-flash",
        messages: msgs,
      };
      if (includeTools) {
        body.tools = tools;
        body.tool_choice = "auto";
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://alzhra-smart-erp.com",
          "X-Title": "Al Zhra Smart ERP",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API error (status ${response.status}): ${errText}`);
      }

      const data = await response.json();
      return data.choices[0].message;
    };

    const firstMsg = await openRouterRequest([
      { role: "system", content: systemPrompt },
      ...messages
    ], true);

    if (firstMsg.tool_calls) {
      const toolCalls = firstMsg.tool_calls;
      const updatedMessages = [...messages, firstMsg];

      for (const toolCall of toolCalls) {
        if (toolCall.function.name === "get_vehicle_info") {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await get_vehicle_info(args as VehicleInfoArgs);
          
          updatedMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            name: "get_vehicle_info",
            content: JSON.stringify(result),
          });
        }
      }

      const secondMsg = await openRouterRequest([
         { role: "system", content: systemPrompt },
         ...updatedMessages
      ], false);

      return new Response(JSON.stringify(secondMsg), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(firstMsg), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})