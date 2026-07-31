import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { OpenAI } from "https://esm.sh/openai@4.26.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
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
    const { messages } = await req.json()
    const apiKey = Deno.env.get("CAR_AI_API_KEY") || Deno.env.get("OPENROUTER_API_KEY") || "sk-or-v1-placeholder";

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://alzhra-smart-erp.com",
        "X-Title": "Al Zhra Smart ERP",
      }
    })

    const chatResponse = await openai.chat.completions.create({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      tools: tools as any,
      tool_choice: "auto",
    })

    const responseMessage = chatResponse.choices[0].message

    if (responseMessage.tool_calls) {
      const toolCalls = responseMessage.tool_calls
      const updatedMessages = [...messages, responseMessage]

      for (const toolCall of toolCalls) {
        if (toolCall.function.name === "get_vehicle_info") {
          const args = JSON.parse(toolCall.function.arguments)
          const result = await get_vehicle_info(args as VehicleInfoArgs)
          
          updatedMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          } as any)
        }
      }

      const secondResponse = await openai.chat.completions.create({
        model: "google/gemini-2.5-flash",
        messages: [
           { role: "system", content: systemPrompt },
           ...updatedMessages
        ],
      })

      return new Response(JSON.stringify(secondResponse.choices[0].message), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(responseMessage), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
