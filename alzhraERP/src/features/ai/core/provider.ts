import { logger } from '../../../core/utils/logger';
/**
 * AI Module - Provider (OpenRouter API client)
 * Handles communication with the AI model API.
 */
import { STRICT_SYSTEM_ROLE } from './prompts';
import { getActiveModel, getModelProvider } from './config';
import { supabase, AI_FEATURES_ENABLED } from '../../../lib/supabaseClient';
import { aiMetrics } from './metrics';

// ── AI Response Types ─────────────────────────────────
interface AIResponseChoice {
  message: {
    content: string;
    role?: string;
  };
  finish_reason?: string;
  index?: number;
}

interface AIResponse {
  choices: AIResponseChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model?: string;
}

interface AIMetricData {
  model: string;
  taskType: string;
  latencyMs: number;
  success: boolean;
  tokensUsed?: {
    prompt: number;
    completion: number;
    total: number;
  };
  errorType?: string;
}
// ──────────────────────────────────────────────────────

let cachedPlatformAIFlag = true;
let lastPlatformAICheck = 0;

export function invalidatePlatformAICache(): void {
  lastPlatformAICheck = 0;
}

// Check if AI features are enabled (compile constant + dynamic Super Admin feature flag)
async function checkAIEnabled(): Promise<void> {
  if (!AI_FEATURES_ENABLED) {
    throw new Error('ميزات الذكاء الاصطناعي معطلة حالياً في النظام.');
  }

  const now = Date.now();
  if (now - lastPlatformAICheck > 30_000) {
    try {
      const { data } = await supabase
        .from('system_platform_configs')
        .select('value')
        .eq('key', 'feature_flags')
        .maybeSingle();

      if (
        data !== null &&
        data.value !== null &&
        typeof data.value === 'object' &&
        !Array.isArray(data.value)
      ) {
        const flags = data.value as Record<string, unknown>;
        cachedPlatformAIFlag = flags.ai_assistance !== false;
      } else {
        cachedPlatformAIFlag = true;
      }
    } catch {
      // Fail open if database query fails
      cachedPlatformAIFlag = true;
    }
    lastPlatformAICheck = now;
  }

  if (!cachedPlatformAIFlag) {
    throw new Error('خدمات الذكاء الاصطناعي معطلة حالياً من قبل إدارة المنصة.');
  }
}

export async function generateAIContent(
  prompt: string,
  systemInstruction: string = STRICT_SYSTEM_ROLE,
  options?: { jsonMode?: boolean; temperature?: number; maxTokens?: number; taskType?: string }
): Promise<string> {
  await checkAIEnabled();

  const isJson = options?.jsonMode ?? true;
  const taskType = options?.taskType ?? 'general';
  const model = getActiveModel();
  const provider = getModelProvider(model);

  const finalSystemInstruction = isJson
    ? `${systemInstruction}\n\nيجب أن يكون الرد بصيغة JSON صالحة وحصرية.`
    : systemInstruction;

  const startTime = performance.now();

  try {
    const { data, error } = await supabase.functions.invoke('ai-proxy', {
      body: {
        prompt,
        model,
        provider,
        systemInstruction: finalSystemInstruction,
        temperature: options?.temperature ?? 0.1,
        maxTokens: options?.maxTokens ?? 1500,
        jsonMode: isJson,
      },
    });

    const latencyMs = performance.now() - startTime;

    if (error) {
      const errorMessage = (error as { message?: string }).message ?? '';
      const errorCode = (error as { code?: string }).code ?? '';

      // Handle specific error codes
      let errorType = 'proxy_error';
      if (errorMessage.includes('402') || errorCode === 'INSUFFICIENT_FUNDS') {
        errorType = 'insufficient_funds';
      } else if (errorMessage.includes('429') || errorCode === 'RATE_LIMIT') {
        errorType = 'rate_limit';
      } else if (errorCode === 'CONFIG_ERROR') {
        errorType = 'config_error';
      } else if (errorCode === 'AUTH_MISSING') {
        errorType = 'auth_error';
      }

      aiMetrics.recordMetric({
        model,
        taskType,
        latencyMs,
        success: false,
        errorType,
      });

      logger.error('provider', 'AI Proxy Error:', error);

      // Provide user-friendly error messages
      if (errorType === 'insufficient_funds') {
        throw new Error(
          'رصيد OpenRouter غير كافٍ لإتمام هذه العملية. يرجى شحن الرصيد أو تقليل عدد النصوص المطلوبة.'
        );
      } else if (errorType === 'rate_limit') {
        throw new Error(
          'تم تجاوز الحد المسموح من الطلبات. يرجى الانتظار قليلاً والمحاولة مرة أخرى.'
        );
      } else if (errorType === 'config_error') {
        throw new Error(
          'خطأ في إعدادات الخادم: مفتاح OpenRouter غير مُكوّن. يرجى التواصل مع مسؤول النظام.'
        );
      } else if (errorType === 'auth_error') {
        throw new Error('غير مصرح: يرجى تسجيل الدخول مرة أخرى.');
      }

      throw new Error(`تعذر الاتصال بالمساعد الذكي: ${errorMessage}`);
    }

    // Extract token usage if available from the proxy response
    const aiResponse = data as AIResponse;
    const usage = aiResponse?.usage;

    const metricData: AIMetricData = {
      model,
      taskType,
      latencyMs,
      success: true,
    };

    if (usage) {
      metricData.tokensUsed = {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
        total: usage.total_tokens,
      };
    }

    aiMetrics.recordMetric(metricData);

    // Edge Function returns the full OpenRouter response
    const content = aiResponse?.choices?.[0]?.message?.content ?? '';

    if (!content) {
      logger.warn('provider', '[AI Provider] Empty response from AI model');
      throw new Error('رد فارغ من المساعد الذكي. يرجى المحاولة مرة أخرى.');
    }

    return content;
  } catch (err) {
    const latencyMs = performance.now() - startTime;

    // Only record if it wasn't already recorded in the error block above
    if (!(err instanceof Error && err.message.includes('تعذر الاتصال'))) {
      aiMetrics.recordMetric({
        model,
        taskType,
        latencyMs,
        success: false,
        errorType:
          err instanceof Error && err.message.includes('معطل') ? 'disabled' : 'network_or_unknown',
      });
    }
    throw err;
  }
}
