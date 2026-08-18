/**
 * AI service layer.
 *
 * Every method calls the secure Edge Function proxy (`ai-proxy`) via
 * `generateAIContent`, so provider keys never reach the browser. Each method
 * parses the model's JSON against the shape its consumer expects and falls
 * back to a SAFE default when the call fails or returns malformed JSON, so
 * call sites never crash on `undefined` fields.
 */

import { logger } from '../../core/utils/logger';
import { generateAIContent } from './core/provider';

/** System role that forces the model to reply with JSON only. */
const SYSTEM_ROLE =
    'أنت مساعد ذكي متخصص في أنظمة ERP لإدارة قطع غيار السيارات والمحاسبة. ' +
    'التزم حصرياً بإخراج JSON صالح بدون أي نص أو تعليقات خارج JSON.';

/**
 * Parse a model response into JSON, tolerating code fences or prose-wrapped
 * output. Returns null when nothing JSON-like can be extracted.
 */
function parseAiJson<T>(content: string): T | null {
    try {
        const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        return JSON.parse(cleaned) as T;
    } catch {
        const objStart = content.indexOf('{');
        const objEnd = content.lastIndexOf('}');
        if (objStart !== -1 && objEnd > objStart) {
            try {
                return JSON.parse(content.slice(objStart, objEnd + 1)) as T;
            } catch { /* fall through */ }
        }
        const arrStart = content.indexOf('[');
        const arrEnd = content.lastIndexOf(']');
        if (arrStart !== -1 && arrEnd > arrStart) {
            try {
                return JSON.parse(content.slice(arrStart, arrEnd + 1)) as T;
            } catch { /* fall through */ }
        }
        return null;
    }
}

/**
 * Invoke the AI proxy and parse the JSON result. Any failure (disabled flag,
 * missing key, malformed JSON, network) returns null — the caller falls back.
 */
async function callAI<T>(taskType: string, prompt: string): Promise<T | null> {
    try {
        const content = await generateAIContent(prompt, SYSTEM_ROLE, {
            jsonMode: true,
            taskType,
        });
        return parseAiJson<T>(content);
    } catch (err) {
        logger.warn('aiService', `AI ${taskType} failed, using safe fallback`, err);
        return null;
    }
}

type AiData = Record<string, unknown>;

interface JournalSuggestionResult {
    debitAccount: string;
    creditAccount: string;
    explanation: string;
}

interface SmartPurchaseResult {
    items: { name: string; suggestedQty: number; priority: string }[];
    summary: string;
}

interface LowStockItem {
    name?: string;
    minStock?: number;
    current?: number;
}

interface SalesForecastResult {
    forecast: number;
    trend: string;
    tips: string[];
}

interface StockDepletionResult {
    items: { name: string; daysLeft: number; urgency: string }[];
}

interface InvoiceHealthResult {
    riskLevel: 'low' | 'medium' | 'high';
    alerts: string[];
}

interface ParsedInvoiceResult {
    customerName: string;
    items: { name: string; quantity: number; price: number }[];
    paymentMethod: string;
}

export const aiService = {
    generateReportAnalysis: async (data: unknown): Promise<AiData> => {
        const result = await callAI<AiData>('report_analysis',
            `حلل التقرير التالي وأعد JSON: summary (نص عربي)، strengths (array نصوص)، weaknesses (array نصوص)، recommendations (array نصائح عربية). البيانات: ${JSON.stringify(data)}`);
        return result ?? {};
    },

    generateInventoryAnalysis: async (data: unknown): Promise<AiData> => {
        const result = await callAI<AiData>('inventory_analysis',
            `حلل بيانات المخزون التالية وأعد JSON: total_value (number)، slow_moving (array بأسماء الأصناف بطيئة الحركة)، fast_moving (array)، insights (array نصائح عربية). البيانات: ${JSON.stringify(data)}`);
        return result ?? {};
    },

    generateDailySummary: async (context: string): Promise<string> => {
        try {
            const content = await generateAIContent(
                `أنشئ ملخصاً يومياً موجزاً بالعربية للأعمال بناءً على: ${context}`,
                'أنت مساعد ذكي. أجب بنص عربي موجز واضح.',
                { jsonMode: false, taskType: 'daily_summary' }
            );
            return content || '';
        } catch (err) {
            logger.warn('aiService', 'AI generateDailySummary failed', err);
            return '';
        }
    },

    generateSmartPricing: async (product: unknown): Promise<AiData> => {
        const result = await callAI<AiData>('smart_pricing',
            `اقترح تسعيراً ذكياً للمنتج التالي وأعد JSON: suggested_price (number)، price_range: { min, max }، justification (نص عربي)، competitor_insight (نص عربي). المنتج: ${JSON.stringify(product)}`);
        return result ?? {};
    },

    generateSalesForecast: async (monthlySales: AiData[]): Promise<SalesForecastResult> => {
        const fallback: SalesForecastResult = { forecast: 0, trend: '', tips: [] };
        const result = await callAI<SalesForecastResult>('sales_forecast',
            `تنبأ بمبيعات الشهر القادم من بيانات المبيعات الشهرية وأعد JSON فقط: { "forecast": number, "trend": "صاعد"|"هابط"|"ثابت", "tips": [نصوص عربية] }. البيانات: ${JSON.stringify(monthlySales)}`);
        if (result && typeof result.forecast === 'number' && Array.isArray(result.tips)) {
            return result;
        }
        return fallback;
    },

    generateSmartPurchaseOrders: async (lowStockItems: LowStockItem[]): Promise<SmartPurchaseResult> => {
        const fallback: SmartPurchaseResult = {
            summary: `بناءً على تحليل البيانات، نوصي بطلب ${lowStockItems.length} منتجات لتغطية الاحتياجات للشهر القادم.`,
            items: lowStockItems.map(item => ({
                name: item.name || '',
                suggestedQty: Math.max((item.minStock ?? 0) * 2, 10),
                priority: item.current === 0 ? 'عاجل' : 'متوسط',
            })),
        };
        const result = await callAI<SmartPurchaseResult>('smart_purchase_orders',
            `اقترح أوامر شراء للمنتجات منخفضة المخزون وأعد JSON فقط: { "summary": نص عربي, "items": [{ "name": string, "suggestedQty": number, "priority": "عاجل"|"متوسط"|"منخفض" }] }. المنتجات: ${JSON.stringify(lowStockItems)}`);
        if (result && typeof result.summary === 'string' && Array.isArray(result.items)) {
            return result;
        }
        return fallback;
    },

    analyzeInvoiceSuspicion: async (invoice: AiData): Promise<InvoiceHealthResult> => {
        const fallback: InvoiceHealthResult = { riskLevel: 'low', alerts: [] };
        const result = await callAI<InvoiceHealthResult>('invoice_suspicion',
            `افحص الفاتورة التالية بحثاً عن علامات شك واحتيال وأعد JSON فقط: { "riskLevel": "low"|"medium"|"high", "alerts": [نصوص عربية] }. الفاتورة: ${JSON.stringify(invoice)}`);
        if (result && ['low', 'medium', 'high'].includes(result.riskLevel) && Array.isArray(result.alerts)) {
            return result;
        }
        return fallback;
    },

    predictStockDepletion: async (products: AiData[]): Promise<StockDepletionResult> => {
        const fallback: StockDepletionResult = { items: [] };
        const result = await callAI<StockDepletionResult>('stock_depletion',
            `تنبأ بمتى ينفد كل منتج من المخزون وأعد JSON فقط: { "items": [{ "name": string, "daysLeft": number, "urgency": "حرج"|"تحذير"|"آمن" }] }. المنتجات: ${JSON.stringify(products)}`);
        if (result && Array.isArray(result.items)) {
            return result;
        }
        return fallback;
    },

    segmentCustomers: async (customers: unknown[]): Promise<AiData> => {
        const result = await callAI<AiData>('customer_segmentation',
            `قسّم العملاء التاليين إلى شرائح وأعد JSON: segments (array بأسماء الشرائح)، insights (array نصائح عربية). العملاء: ${JSON.stringify(customers)}`);
        return result ?? {};
    },

    suggestCrossSell: async (currentItems: string[]): Promise<string[]> => {
        const result = await callAI<string[]>('cross_sell',
            `اقترح منتجات تكميلية (قطع غيار سيارات) للبيع العابر مع عناصر السلة الحالية وأعد JSON array من النصوص فقط: ["اسم منتج", ...]. العناصر الحالية: ${JSON.stringify(currentItems)}`);
        if (result && Array.isArray(result)) {
            return result.filter((item): item is string => typeof item === 'string').slice(0, 6);
        }
        return [];
    },

    rateSuppliers: async (suppliers: unknown[]): Promise<AiData> => {
        const result = await callAI<AiData>('supplier_rating',
            `قيّم الموردين التاليين وأعد JSON: ratings (array فيها name و score من 1-10 و summary عربية)، recommendations (array نصائح). الموردون: ${JSON.stringify(suppliers)}`);
        return result ?? {};
    },
    parseInvoiceCommand: async (command: string): Promise<ParsedInvoiceResult> => {
        const fallback: ParsedInvoiceResult = { customerName: '', items: [], paymentMethod: '' };
        const result = await callAI<ParsedInvoiceResult>('parse_invoice',
            `استخرج بيانات الفاتورة من الأمر الصوتي/النصي التالي وأعد JSON فقط: { "customerName": string, "items": [{ "name": string, "quantity": number, "price": number }], "paymentMethod": "cash"|"credit" }. الأمر: "${command}"`);
        if (result && Array.isArray(result.items)) {
            return {
                customerName: result.customerName || '',
                items: result.items,
                paymentMethod: result.paymentMethod === 'cash' ? 'cash' : 'credit',
            };
        }
        return fallback;
    },

    generateCustomReport: async (question: string, context: string): Promise<string> => {
        try {
            const content = await generateAIContent(
                `السؤال: ${question}\nالسياق/البيانات: ${context}\nأنشئ تقريراً تحليلياً بالعربية منظم الأقسام.`,
                'أنت محلل أعمال. أجب بنص عربي منظم.',
                { jsonMode: false, taskType: 'custom_report' }
            );
            return content || '';
        } catch (err) {
            logger.warn('aiService', 'AI generateCustomReport failed', err);
            return '';
        }
    },

    suggestJournalEntry: async (description: string, amount: number): Promise<JournalSuggestionResult> => {
        const fallback: JournalSuggestionResult = { debitAccount: '', creditAccount: '', explanation: '' };
        const result = await callAI<JournalSuggestionResult>('journal_suggestion',
            `اقترح قيداً محاسبياً للمعاملة التالية وأعد JSON فقط: { "debitAccount": string, "creditAccount": string, "explanation": نص عربي }. الوصف: "${description}"، المبلغ: ${amount}`);
        if (result && typeof result.debitAccount === 'string' && typeof result.creditAccount === 'string') {
            return result;
        }
        return fallback;
    },

    generateMorningBrief: async (context: string): Promise<string> => {
        try {
            const content = await generateAIContent(
                `أنشئ موجزاً صباحياً للأعمال بالعربية بناءً على: ${context}`,
                'أنت مساعد ذكي. أجب بنص عربي موجز منظم.',
                { jsonMode: false, taskType: 'morning_brief' }
            );
            return content || '';
        } catch (err) {
            logger.warn('aiService', 'AI generateMorningBrief failed', err);
            return '';
        }
    },

    calculateBusinessHealth: async (data: unknown): Promise<AiData> => {
        const result = await callAI<AiData>('business_health',
            `احسب مؤشر صحة الأعمال من البيانات التالية وأعد JSON: score (number 0-100)، status ("ممتاز"|"جيد"|"متوسط"|"ضعيف")، factors (array عربية)، recommendations (array عربية). البيانات: ${JSON.stringify(data)}`);
        return result ?? {};
    },

    detectAnomalies: async (transactions: unknown[]): Promise<AiData> => {
        const result = await callAI<AiData>('anomaly_detection',
            `اكتشف الحالات الشاذة في المعاملات التالية وأعد JSON: anomalies (array فيها description عربية و severity "منخفض"|"متوسط"|"عالي" و transaction_id)، summary (نص عربي). المعاملات: ${JSON.stringify(transactions)}`);
        return result ?? {};
    },

    analyzeMarketPosition: async (data: unknown): Promise<AiData> => {
        const result = await callAI<AiData>('market_position',
            `حلل الوضع التنافسي من البيانات التالية وأعد JSON: position ("قوي"|"متوسط"|"ضعيف")، strengths (array عربية)، opportunities (array عربية)، threats (array عربية). البيانات: ${JSON.stringify(data)}`);
        return result ?? {};
    },
};
