import React, { useState } from 'react';
import { MessageSquare, Printer, Palette, X, FileSpreadsheet } from 'lucide-react';
import type { StatementMovement } from '../../service';
import type { Party, PartyType } from '../../types';
import { formatCurrency } from '../../../../core/utils';
import { formatLocalDate } from '../../../../core/utils/dateUtils';
import { buildWhatsAppLink } from '../../../debts/lib/whatsapp';

interface Props {
  selectedMovements: StatementMovement[];
  selectedParty: Party | undefined;
  partyType: PartyType;
  companyName: string;
  onClearSelection: () => void;
  onApplyColor: (color: string | null) => void;
  onPrintSingleTransaction: (movement: StatementMovement) => void;
  onPrintSelectedStatement: () => void;
  onExportSelectedExcel: () => void;
}

export const StatementSelectedActionsBar: React.FC<Props> = ({
  selectedMovements,
  selectedParty,
  partyType,
  companyName,
  onClearSelection,
  onApplyColor,
  onPrintSingleTransaction,
  onPrintSelectedStatement,
  onExportSelectedExcel,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Multi-currency calculation: strictly partitioned per currency
  const isSupplier = partyType === 'supplier';
  const currencyStats = React.useMemo(() => {
    const map = new Map<string, { currency: string; debit: number; credit: number; net: number }>();
    selectedMovements.forEach(m => {
      const curr = m.currency || 'SAR';
      if (!map.has(curr)) {
        map.set(curr, { currency: curr, debit: 0, credit: 0, net: 0 });
      }
      const item = map.get(curr)!;
      item.debit += Number(m.debit) || 0;
      item.credit += Number(m.credit) || 0;
      item.net = isSupplier ? item.credit - item.debit : item.debit - item.credit;
    });
    return Array.from(map.values());
  }, [selectedMovements, isSupplier]);

  if (selectedMovements.length === 0) return null;

  const handleSendSelectedWhatsApp = () => {
    if (!selectedParty) return;

    const todayFormatted = formatLocalDate();
    let text = `🧾 *تفاصيل معاملات محددة من كشف الحساب*\n`;
    text += `🏢 *${companyName}*\n`;
    text += `👤 الجهة: *${selectedParty.name}*\n`;
    text += `📅 التاريخ: ${todayFormatted}\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📋 *المعاملات المحددة (${selectedMovements.length}):*\n\n`;

    selectedMovements.forEach((m, idx) => {
      const statusText =
        m.payment_status === 'paid'
          ? ' [خالص / مسدد]'
          : m.payment_status === 'partially_paid'
            ? ' [مسدد جزئياً]'
            : m.payment_status === 'unpaid'
              ? ' [غير مسدد]'
              : '';

      text += `${idx + 1}. *${m.operation_type || m.type}* (${m.ref})\n`;
      text += `   التاريخ: ${m.date}\n`;
      if (m.debit > 0) text += `   مدين (+): ${formatCurrency(m.debit, m.currency)}\n`;
      if (m.credit > 0) text += `   دائن (-): ${formatCurrency(m.credit, m.currency)}\n`;
      if (statusText) text += `   الحالة:${statusText}\n`;
      if (m.desc && m.desc !== m.operation_type) text += `   البيان: ${m.desc}\n`;
      text += `\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `📊 *الخلاصة المالية للمعاملات المحددة:*\n`;
    currencyStats.forEach(stat => {
      text += `▪ *العملة: ${stat.currency}*\n`;
      text += `   إجمالي المدين: ${formatCurrency(stat.debit, stat.currency)}\n`;
      text += `   إجمالي الدائن: ${formatCurrency(stat.credit, stat.currency)}\n`;
      text += `   💰 صافي المستحق: *${formatCurrency(stat.net, stat.currency)}*\n\n`;
    });
    text += `شاكرين ومقدرين حسن تعاونكم معنا.`;

    if (selectedParty.phone) {
      const link = buildWhatsAppLink(selectedParty.phone, text);
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      navigator.clipboard.writeText(text);
      alert('تم نسخ تفاصيل المعاملات المحددة إلى الحافظة (لا يوجد هاتف مسجل).');
    }
  };

  const isSingle = selectedMovements.length === 1;
  const singleMovement = selectedMovements[0];

  return (
    <div className="dark:bg-slate-900/98 animate-in fade-in slide-in-from-bottom-4 fixed bottom-6 left-1/2 z-40 flex w-[92%] max-w-4xl -translate-x-1/2 flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-900/95 p-3.5 text-white shadow-2xl backdrop-blur-md">
      {/* Selection Stats */}
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 font-mono text-xs font-bold">
          {selectedMovements.length}
        </span>
        <div className="space-y-0.5">
          <p className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span>
              تم تحديد {selectedMovements.length}{' '}
              {selectedMovements.length === 1 ? 'معاملة' : 'معاملات'}
            </span>
            {currencyStats.map(stat => (
              <span key={stat.currency} className="text-[10px] font-normal text-slate-300">
                [{stat.currency}:{' '}
                <strong className="font-mono text-emerald-400" dir="ltr">
                  {formatCurrency(stat.net, stat.currency)}
                </strong>
                ]
              </span>
            ))}
          </p>
          <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
            {currencyStats.map(stat => (
              <span key={stat.currency}>
                {stat.currency}: مدين {formatCurrency(stat.debit, stat.currency)} | دائن{' '}
                {formatCurrency(stat.credit, stat.currency)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* WhatsApp Send */}
        <button
          type="button"
          onClick={handleSendSelectedWhatsApp}
          className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-green-700"
          title="إرسال تفاصيل المعاملات المحددة عبر واتساب"
        >
          <MessageSquare size={14} />
          <span>إرسال واتساب</span>
        </button>

        {/* Print Action */}
        {isSingle &&
        (singleMovement.reference_type?.includes('invoice') ||
          singleMovement.reference_type?.includes('bond') ||
          singleMovement.reference_type?.includes('receipt') ||
          singleMovement.reference_type?.includes('payment')) ? (
          <button
            type="button"
            onClick={() => onPrintSingleTransaction(singleMovement)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700"
            title="طباعة إشعار / فاتورة المعاملة بمفردها"
          >
            <Printer size={14} />
            <span>طباعة المستند</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onPrintSelectedStatement}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-blue-700"
            title="طباعة كشف الحساب للمعاملات المحددة فقط"
          >
            <Printer size={14} />
            <span>طباعة المحدد</span>
          </button>
        )}

        {/* Excel Export of Selected */}
        <button
          type="button"
          onClick={onExportSelectedExcel}
          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-800"
          title="تصدير المعاملات المحددة إلى ملف إكسل (.xlsx)"
        >
          <FileSpreadsheet size={14} />
          <span>تصدير إكسل</span>
        </button>

        {/* Color Highlighter Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 shadow-sm transition-all hover:bg-slate-700"
            title="تلوين وتمييز المعاملات المحددة للتوضيح للعميل"
          >
            <Palette size={14} className="text-amber-400" />
            <span>تلوين</span>
          </button>

          {showColorPicker && (
            <div className="absolute bottom-full left-0 z-50 mb-2 flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 p-2 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  onApplyColor('emerald');
                  setShowColorPicker(false);
                }}
                className="h-6 w-6 rounded-full border-2 border-white/40 bg-emerald-500 transition-transform hover:scale-110"
                title="أخضر (خالص / مسدد)"
              />
              <button
                type="button"
                onClick={() => {
                  onApplyColor('rose');
                  setShowColorPicker(false);
                }}
                className="h-6 w-6 rounded-full border-2 border-white/40 bg-rose-500 transition-transform hover:scale-110"
                title="أحمر (مستحق / غير مسدد)"
              />
              <button
                type="button"
                onClick={() => {
                  onApplyColor('amber');
                  setShowColorPicker(false);
                }}
                className="h-6 w-6 rounded-full border-2 border-white/40 bg-amber-500 transition-transform hover:scale-110"
                title="أصفر / كهرماني (جزئي / قيد المراجعة)"
              />
              <button
                type="button"
                onClick={() => {
                  onApplyColor('blue');
                  setShowColorPicker(false);
                }}
                className="h-6 w-6 rounded-full border-2 border-white/40 bg-blue-500 transition-transform hover:scale-110"
                title="أزرق (ملاحظة هامة)"
              />
              <button
                type="button"
                onClick={() => {
                  onApplyColor(null);
                  setShowColorPicker(false);
                }}
                className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-600"
                title="إلغاء التلوين"
              >
                مسح
              </button>
            </div>
          )}
        </div>

        {/* Clear Selection */}
        <button
          type="button"
          onClick={onClearSelection}
          className="rounded-lg bg-slate-800 p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
          title="إلغاء التحديد"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
