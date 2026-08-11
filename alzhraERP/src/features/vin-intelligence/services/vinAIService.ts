/**
 * VIN AI Intelligence Service
 * ===========================
 * Leverages DeepSeek AI to provide intelligent insights about vehicles,
 * parts compatibility, market demand, and procurement recommendations.
 */
import { supabase } from '../../../lib/supabaseClient';
import { logger } from '../../../core/utils/logger';
import { getActiveModel, getModelProvider } from '../../ai/core/config';
import type { VinAnalysisResult, VehicleCorePart } from '../types';

export interface VinAIInsight {
  summary: string;
  marketAnalysis: string;
  procurementAdvice: string;
  popularParts: string[];
  riskFactors: string[];
  recommendedActions: string[];
}

/** Expected shape of the ai-proxy Edge Function response */
interface AIProxyResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

/** System prompt that instructs the AI how to analyze VIN data (Arabic) */
const VIN_AI_SYSTEM_PROMPT = `أنت خبير في قطع غيار السيارات وتحليل سوق قطع الغيار في منطقة الخليج (السعودية، الإمارات، الكويت، إلخ).
قم بتحليل بيانات المركبة وقطع الغيار التالية وأعط:
1. ملخص عن المركبة ومدى انتشارها في السوق الخليجي
2. تحليل الطلب على قطع الغيار الرئيسية لهذه المركبة
3. نصائح للمشتريات (أي القطع الأكثر ربحية، أيها يجب تجنبه)
4. قائمة بأكثر 5 قطع غيار مطلوبة
5. عوامل المخاطرة (مشاكل تقادم، ندرة، الخ)
6. إجراءات موصى بها للمخزون

يجب أن يكون الرد باللغة العربية بصيغة JSON صالحة كالتالي:
{
  "summary": "...",
  "marketAnalysis": "...",
  "procurementAdvice": "...",
  "popularParts": ["...", "..."],
  "riskFactors": ["...", "..."],
  "recommendedActions": ["...", "..."]
}`;

/**
 * Analyze VIN result using AI for market intelligence
 */
export async function analyzeVinWithAI(
  vinResult: VinAnalysisResult
): Promise<VinAIInsight | null> {
  try {
    const model = getActiveModel();
    const provider = getModelProvider(model);

    // Build a concise data context from the VIN result
    const vehicleInfo = [
      `المركبة: ${vinResult.vehicle.make} ${vinResult.vehicle.model}`,
      `السنة: ${vinResult.vehicle.year || 'غير معروف'}`,
      `المحرك: ${vinResult.vehicle.engineSize || 'غير معروف'}`,
      `ناقل الحركة: ${vinResult.vehicle.transmission || 'غير معروف'}`,
      `نوع الدفع: ${vinResult.vehicle.driveType || 'غير معروف'}`,
      `السوق: ${vinResult.vehicle.market || 'غير معروف'}`,
    ].join('\n');

    const partsInfo = vinResult.coreParts
      .slice(0, 20)
      .map(p => {
        const invCount = p.inventoryMatches.length;
        return `- ${p.canonicalPartName} (${p.category}): OEM ${p.oemNumbers.slice(0, 3).join(', ')}, الطلب: ${p.demandLevel || 'غير معروف'}, المبيعات: ${p.salesCount || 0}, متوفر بالمخزون: ${invCount > 0 ? 'نعم' : 'لا'}`;
      })
      .join('\n');

    const prompt = `
بيانات المركبة:
${vehicleInfo}

قطع الغيار المرتبطة (${vinResult.coreParts.length} قطعة):
${partsInfo}

قطع متطابقة بالمخزون: ${vinResult.inventoryMatches.length}
قطع مفقودة: ${vinResult.missingParts.length}

${vinResult.warnings?.length ? 'تحذيرات: ' + vinResult.warnings.join(', ') : ''}
`;

    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        prompt,
        model,
        provider,
        systemInstruction: VIN_AI_SYSTEM_PROMPT,
        temperature: 0.3,
        // 6 Arabic JSON sections need headroom — 1000 tokens truncated responses
        maxTokens: 2048,
        jsonMode: true,
      },
    });

    if (error) {
      logger.error('VIN', 'AI proxy error', error);
      return null;
    }

    const response = data as AIProxyResponse;
    const content = response?.choices?.[0]?.message?.content;
    if (!content) return null;

    // Parse the JSON response
    try {
      // Clean any markdown code fences
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const parsed: VinAIInsight = JSON.parse(jsonStr);
      return parsed;
    } catch (parseErr) {
      logger.error('VIN', 'Failed to parse AI response', parseErr);
      return null;
    }
  } catch (err) {
    logger.error('VIN', 'AI analysis failed', err);
    return null;
  }
}

/**
 * Get AI-powered part description and compatibility details
 */
export async function getPartAIInsight(
  part: VehicleCorePart,
  vehicleMake: string,
  vehicleModel: string
): Promise<string | null> {
  try {
    const model = getActiveModel();
    const provider = getModelProvider(model);

    const prompt = `
المركبة: ${vehicleMake} ${vehicleModel}
اسم القطعة: ${part.canonicalPartName}
الفئة: ${part.category}
أرقام OEM: ${part.oemNumbers.join(', ')}
حالة التوافق: ${part.fitmentStatus}

قدم شرحاً موجزاً بالعربية عن هذه القطعة واستخداماتها ومدى توافقها مع المركبة المذكورة (3-4 جمل فقط).
`;

    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        prompt,
        model,
        provider,
        systemInstruction: 'أنت خبير ميكانيكي متخصص في قطع غيار السيارات. أجب بالعربية فقط وباختصار.',
        temperature: 0.3,
        maxTokens: 300,
        jsonMode: false,
      },
    });

    if (error) return null;
    const response = data as AIProxyResponse;
    return response?.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}
