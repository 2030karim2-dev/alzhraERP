/**
 * AI service layer.
 *
 * NOTE: These are typed placeholders (stubs). Real AI calls go through the
 * secure Edge Function proxy (`supabase/functions/ai-proxy`) so provider keys
 * never reach the browser. Each stub returns a SAFE default shape that matches
 * what its consumers expect, so call sites never crash on `undefined` fields.
 */

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
    generateReportAnalysis: async (_data: unknown): Promise<AiData> => ({}),
    generateInventoryAnalysis: async (_data: unknown): Promise<AiData> => ({}),
    generateDailySummary: async (_context: string): Promise<string> => "",
    generateSmartPricing: async (_product: unknown): Promise<AiData> => ({}),
    generateSalesForecast: async (_monthlySales: AiData[]): Promise<SalesForecastResult> => ({
        forecast: 0,
        trend: '',
        tips: [],
    }),
    generateSmartPurchaseOrders: async (lowStockItems: LowStockItem[]): Promise<SmartPurchaseResult> => ({
        summary: `بناءً على تحليل البيانات، نوصي بطلب ${lowStockItems.length} منتجات لتغطية الاحتياجات للشهر القادم.`,
        items: lowStockItems.map(item => ({
            name: item.name || '',
            suggestedQty: Math.max((item.minStock ?? 0) * 2, 10),
            priority: item.current === 0 ? 'عاجل' : 'متوسط'
        }))
    }),
    analyzeInvoiceSuspicion: async (_invoice: AiData): Promise<InvoiceHealthResult> => ({
        riskLevel: 'low',
        alerts: [],
    }),
    predictStockDepletion: async (_products: AiData[]): Promise<StockDepletionResult> => ({
        items: [],
    }),
    segmentCustomers: async (_customers: unknown[]): Promise<AiData> => ({}),
    suggestCrossSell: async (_currentItems: string[]): Promise<string[]> => [],
    rateSuppliers: async (_suppliers: unknown[]): Promise<AiData> => ({}),
    parseInvoiceCommand: async (_command: string): Promise<ParsedInvoiceResult> => ({
        customerName: '',
        items: [],
        paymentMethod: '',
    }),
    generateCustomReport: async (_question: string, _context: string): Promise<string> => "",
    suggestJournalEntry: async (_description: string, _amount: number): Promise<JournalSuggestionResult> => ({
        debitAccount: '',
        creditAccount: '',
        explanation: '',
    }),
    generateMorningBrief: async (_context: string): Promise<string> => "",
    calculateBusinessHealth: async (_data: unknown): Promise<AiData> => ({}),
    detectAnomalies: async (_transactions: unknown[]): Promise<AiData> => ({}),
    analyzeMarketPosition: async (_data: unknown): Promise<AiData> => ({}),
};
