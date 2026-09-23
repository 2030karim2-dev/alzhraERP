/* eslint-disable max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-type-conversion, @typescript-eslint/restrict-template-expressions */
// ============================================
// Sales Requisitions Sharing Utilities
// WhatsApp and Telegram sharing for purchase requisitions
// ============================================

import type { RequisitionItem, RequisitionSupplier } from '../types/requisitions';
import { formatLocalDate } from '@/core/utils/dateUtils';
import { buildWhatsAppLink, hasValidWhatsAppPhone } from '@/features/debts/lib/whatsapp';

export interface RequisitionSharePayload {
  companyName: string;
  supplier?: RequisitionSupplier | null;
  items: RequisitionItem[];
  notes?: string;
  date?: string;
}

/**
 * Builds an elegant, readable text representation for messaging apps
 */
export const buildRequisitionsMessageText = (payload: RequisitionSharePayload): string => {
  const dateStr = payload.date || formatLocalDate();
  const validItems = payload.items.filter(
    item => item.name.trim() !== '' || item.partNumber.trim() !== ''
  );

  let totalQty = 0;
  validItems.forEach(item => {
    totalQty += Number(item.quantity) || 1;
  });

  const lines: string[] = [];

  // Header
  lines.push(`📦 *طلب شراء ومطلوبات جديدة*`);
  if (payload.companyName) {
    lines.push(`🏢 *${payload.companyName}*`);
  }
  lines.push(`📅 *التاريخ:* ${dateStr}`);

  if (payload.supplier?.name) {
    lines.push(`👤 *المورد:* ${payload.supplier.name}`);
  }

  lines.push(`────────────────────`);

  // Items List
  if (validItems.length === 0) {
    lines.push(`(لا توجد أصناف مسجلة)`);
  } else {
    validItems.forEach((item, index) => {
      const num = index + 1;
      const name = item.name.trim() || 'صنف بدون اسم';
      const partNo = item.partNumber.trim() || '---';
      const brand = item.brand.trim() || '---';
      const qty = item.quantity || 1;

      lines.push(`${num}. *${name}*`);
      lines.push(`   ▫️ رقم القطعة: \`${partNo}\``);
      lines.push(`   ▫️ الشركة: ${brand}`);
      lines.push(`   ▫️ الكمية: *${qty}*`);
      if (item.notes?.trim()) {
        lines.push(`   ▫️ ملاحظة: ${item.notes.trim()}`);
      }
      lines.push('');
    });
  }

  lines.push(`────────────────────`);
  lines.push(`📊 *إجمالي الأصناف:* ${validItems.length} | *إجمالي الكمية:* ${totalQty}`);

  if (payload.notes?.trim()) {
    lines.push(`📝 *ملاحظات عامة:*`);
    lines.push(payload.notes.trim());
  }

  lines.push('');
  lines.push(`يرجى التكرم بتأكيد توفر القطع المذكورة أعلاه مع الأسعار. وشكراً لكم.`);

  return lines.join('\n');
};

/**
 * Open WhatsApp with the generated text pre-filled
 */
export const openRequisitionsWhatsApp = (
  payload: RequisitionSharePayload,
  customPhone?: string
): void => {
  const text = buildRequisitionsMessageText(payload);
  const targetPhone = customPhone?.trim() || payload.supplier?.phone?.trim() || '';

  if (hasValidWhatsAppPhone(targetPhone)) {
    const link = buildWhatsAppLink(targetPhone, text);
    window.open(link, '_blank', 'noopener,noreferrer');
  } else {
    // If no valid phone number, open wa.me share with text only
    const link = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(link, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Open Telegram share with pre-filled text
 */
export const openRequisitionsTelegram = (payload: RequisitionSharePayload): void => {
  const text = buildRequisitionsMessageText(payload);
  const link = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(text)}`;
  window.open(link, '_blank', 'noopener,noreferrer');
};
