import { generateAIContent } from '../../ai/core/provider';
import { logger } from '../../../core/utils/logger';
import type { FollowUpDashboardRow } from '../types';

export type ReminderTone = 'friendly' | 'formal' | 'urgent' | 'legal';

export interface SmartReminderResponse {
  message: string;
  tone: ReminderTone;
  highlights: string[];
}

export interface DebtRiskAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0 - 100
  recoveryProbability: number; // 0 - 100 %
  summary: string;
  keyFactors: string[];
  recommendedStrategy: string;
  suggestedActions: string[];
  paymentPlanSuggestion?: string;
}

const SYSTEM_DEBT_ROLE =
  'أنت خبير مالي وإداري متخصص في إدارة الائتمان والتحصيل لمنظومة الزهراء المحاسبية. ' +
  'تتميز باللباقة العالية، الدقة المحاسبية، والقدرة على صياغة رسائل واتساب احترافية تناسب الثقافة العربية وتراعي الحفاظ على علاقة العميل مع ضمان سرعة التحصيل. ' +
  'أخرج دائماً JSON صالح فقط.';

/**
 * Clean & parse JSON from AI model response
 */
function parseAiJson<T>(content: string): T | null {
  try {
    const cleaned = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    return JSON.parse(cleaned) as T;
  } catch {
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(content.slice(start, end + 1)) as T;
      } catch {
        /* fallback */
      }
    }
    return null;
  }
}

export const debtAiService = {
  /**
   * Generate an intelligent, tone-specific WhatsApp reminder message
   */
  generateSmartReminder: async (params: {
    row: FollowUpDashboardRow;
    tone: ReminderTone;
    companyName?: string;
    bankDetails?: string;
  }): Promise<SmartReminderResponse> => {
    const { row, tone, companyName, bankDetails } = params;

    const toneInstructions: Record<ReminderTone, string> = {
      friendly: 'نبرة ودية ومرحبة، تذكير لطيف بالفاتورة، شكر العميل على تعامله، الحفاظ على المودة.',
      formal: 'نبرة رسمية ومهنية راقية، توضيح رقم الحساب والمبلغ المستحق وتاريخ الاستحقاق والرجاء بسداد المبلغ.',
      urgent: 'نبرة حازمة وعاجلة، التركيز على تجاوز موعد الاستحقاق أو إخلاف الوعد وأهمية السداد لتفادي تعليق الحساب.',
      legal: 'نبرة إشعار نهائي رسمي وقانوني، تنبيه نهائي قبل اتخاذ الإجراءات الإدارية والقانونية وإيقاف التسهيلات الائتمانية.',
    };

    const prompt = `
قم بصياغة رسالة واتساب احترافية ومؤثرة لتذكير العميل بسداد مديونيته:

بيانات العميل والمديونية:
- اسم المنشأة: ${companyName || 'منظومة الزهراء'}
- اسم العميل: ${row.party_name}
- إجمالي الرصيد المستحق: ${row.outstanding_balance} ${row.currency_code}
- المبلغ المتأخر: ${row.overdue_amount} ${row.currency_code}
- عدد أيام التأخير: ${row.days_overdue} يوم
- تاريخ الاستحقاق: ${row.oldest_due_date || 'غير محدد'}
- عدد الفواتير: ${row.invoice_count}
- حالة الوعود السابقة: ${row.has_broken_promise ? 'يوجد وعد سابق تم إخلافه' : 'سجل منتظم'}
${bankDetails ? `- بيانات التحويل البنكي: ${bankDetails}` : ''}

النبرة المطلوبة:
${toneInstructions[tone]}

المطلوب:
أرجع JSON بالهيكل التالي فقط:
{
  "message": "نص رسالة الواتساب باللغة العربية مع إيموجي منسق وتنسيق خطوط الواتساب (*غامق*) وتفاصيل السداد",
  "tone": "${tone}",
  "highlights": ["نقطة تم التركيز عليها 1", "نقطة 2"]
}
`;

    try {
      const response = await generateAIContent(prompt, SYSTEM_DEBT_ROLE, {
        jsonMode: true,
        taskType: 'debt_smart_reminder',
      });
      const parsed = parseAiJson<SmartReminderResponse>(response);
      if (parsed?.message) {
        return parsed;
      }
    } catch (err) {
      logger.warn('debtAiService', 'AI smart reminder generation failed, using template fallback', err);
    }

    // Fallback template
    return {
      message: `السلام عليكم ورحمة الله وبركاته،\nالأخ العزيز / *${row.party_name}* المحترم 🌸\n\nنود تذكيركم بلطف بوجود رصيد مستحق بقيمة: *${row.outstanding_balance} ${row.currency_code}* لصالح *${companyName || 'منشأتنا'}*.\n\nنرجو التكرم بالاطلاع وترتيب السداد في أقرب وقت شاكرين لكم حسن تعاونكم الدائم. ✨`,
      tone,
      highlights: ['تذكير افتراضي بالمبلغ المستحق'],
    };
  },

  /**
   * Deep AI Risk & Recovery Analysis for a Debtor
   */
  analyzeDebtRisk: async (row: FollowUpDashboardRow, companyName?: string): Promise<DebtRiskAnalysis> => {
    const prompt = `
قم بتحليل مخاطر الائتمان وتقييم سلوك السداد للعميل التالي وتقديم استراتيجية تحصيل ذكية:

بيانات العميل:
- اسم العميل: ${row.party_name}
- التصنيف: ${row.category}
- الرصيد القائم: ${row.outstanding_balance} ${row.currency_code}
- المبلغ المتأخر: ${row.overdue_amount} ${row.currency_code}
- عدد أيام التأخير: ${row.days_overdue} يوم
- حد الائتمان المسموح: ${row.credit_limit || 'غير محدد'}
- عدد الفواتير المستحقة: ${row.invoice_count}
- الرصيد الافتتاحي: ${row.opening_balance}
- هل أخلف وعوداً سابقة: ${row.has_broken_promise ? 'نعم' : 'لا'}
- عدد الوعود القائمة: ${row.pending_promise_count} بمبلغ ${row.pending_promise_amount}
- تصنيف النظام الحالي: ${row.classification}

المطلوب:
أرجع JSON بالهيكل التالي:
{
  "riskLevel": "low" | "medium" | "high" | "critical",
  "riskScore": (رقم من 0 إلى 100 يمثل درجة الخطورة),
  "recoveryProbability": (رقم من 0 إلى 100 يمثل نسبة احتمالية استرداد المبلغ),
  "summary": "ملخص تشخيصي لحالة العميل وسلوكه الائتماني باللغة العربية",
  "keyFactors": ["عامل خطر 1", "عامل 2"],
  "recommendedStrategy": "استراتيجية التحصيل المقترحة بدقة",
  "suggestedActions": ["إجراء فوري 1", "إجراء 2", "إجراء 3"],
  "paymentPlanSuggestion": "اقتراح جدولة أو تقسيط إن كان مناسباً"
}
`;

    try {
      const response = await generateAIContent(prompt, SYSTEM_DEBT_ROLE, {
        jsonMode: true,
        taskType: 'debt_risk_analysis',
      });
      const parsed = parseAiJson<DebtRiskAnalysis>(response);
      if (parsed?.riskLevel && typeof parsed.riskScore === 'number') {
        return parsed;
      }
    } catch (err) {
      logger.warn('debtAiService', 'AI risk analysis failed, using rule-based fallback', err);
    }

    // Rule-based Fallback
    const isCritical = row.days_overdue > 30 || row.has_broken_promise;
    const isHigh = row.days_overdue > 14;
    const isMedium = row.days_overdue > 0;

    const riskLevel = isCritical ? 'critical' : isHigh ? 'high' : isMedium ? 'medium' : 'low';
    const riskScore = isCritical ? 85 : isHigh ? 65 : isMedium ? 40 : 15;
    const recoveryProbability = 100 - riskScore + 10;

    return {
      riskLevel,
      riskScore,
      recoveryProbability: Math.min(100, Math.max(10, recoveryProbability)),
      summary: `العميل لديه رصيد مستحق بقيمة ${row.outstanding_balance} ${row.currency_code} بتأخير ${row.days_overdue} يوم.`,
      keyFactors: [
        `تأخير السداد: ${row.days_overdue} يوم`,
        row.has_broken_promise ? 'سجل وعد سداد مخلَف سابقاً' : 'لا توجد وعود مخلَفة',
        `عدد الفواتير المفتوحة: ${row.invoice_count}`,
      ],
      recommendedStrategy: isCritical
        ? 'التواصل الهاتفي العاجل مع الإدارة وطلب دفعة نقدية فورية مع تعليق البيع الآجل.'
        : 'إرسال تذكير رسمي عبر الواتساب وتحديد موعد مؤكد لوعد السداد.',
      suggestedActions: [
        'إرسال تذكير واتساب مخصص',
        'طلب سداد دفعة بنكية اليوم',
        'مراجعة حد الائتمان الممنوح',
      ],
      paymentPlanSuggestion:
        row.outstanding_balance > 5000
          ? `تقسيط المبلغ (${row.outstanding_balance} ${row.currency_code}) على دفعتين متساويتين.`
          : undefined,
    };
  },

  /**
   * Format an ultra-clean WhatsApp Account Statement Summary
   */
  generateWhatsAppStatementSummary: (params: {
    partyName: string;
    totalDebit: number;
    totalCredit: number;
    finalBalance: number;
    currency: string;
    companyName?: string;
    dateRangeText?: string;
    bankInfo?: string;
  }): string => {
    const { partyName, totalDebit, totalCredit, finalBalance, currency, companyName, dateRangeText, bankInfo } = params;

    const balanceText =
      finalBalance >= 0
        ? `المبلغ المطلوب سداده: *${finalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}*`
        : `رصيد دائن لصالحكم: *${Math.abs(finalBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}*`;

    return `🧾 *كشف حساب مالي ملخص*
━━━━━━━━━━━━━━━━━━
🏢 *المنشأة:* ${companyName || 'منظومة الزهراء'}
👤 *العميل:* ${partyName}
📅 *الفترة:* ${dateRangeText || new Date().toLocaleDateString('en-GB')}
━━━━━━━━━━━━━━━━━━
📊 *الملخص المالي:*
▫️ إجمالي الحركات المدينة: ${totalDebit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}
▫️ إجمالي المدفوعات والسندات: ${totalCredit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ${currency}
━━━━━━━━━━━━━━━━━━
📌 *الرصيد النهائي المستحق:*
👉 ${balanceText}
━━━━━━━━━━━━━━━━━━
${bankInfo ? `💳 *بيانات السداد البنكي:*\n${bankInfo}\n━━━━━━━━━━━━━━━━━━\n` : ''}📄 _مرفق مع هذه الرسالة ملف كشف الحساب التفصيلي (Excel)_
شاكرين ومقدرين تعاملكم الدائم معنا 🌸`;
  },
};
