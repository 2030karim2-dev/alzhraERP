import React, { useRef } from 'react';
import { Printer } from 'lucide-react';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import type { DailyDrawerSummary } from '../types';

interface ReconciliationPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: DailyDrawerSummary;
  actualCash: number;
  actualCard: number;
  floatRetained: number;
  cashToOwner: number;
  shopName?: string;
}

export const ReconciliationPrintModal: React.FC<ReconciliationPrintModalProps> = ({
  isOpen,
  onClose,
  summary,
  actualCash,
  actualCard,
  floatRetained,
  cashToOwner,
  shopName = 'مؤسسة الزهراء لقطع الغيار',
}) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const cashVariance = Math.round((actualCash - summary.expected_cash_in_drawer) * 100) / 100;
  const cardVariance = Math.round((actualCard - summary.expected_card_terminal) * 100) / 100;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="طباعة إيصال إقفال اليومية">
      <div className="space-y-4">
        {/* Scoped style to isolate thermal print from page UI */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #reconciliation-print-receipt, #reconciliation-print-receipt * {
              visibility: visible !important;
            }
            #reconciliation-print-receipt {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 80mm !important;
              margin: 0 auto !important;
              padding: 4mm !important;
              box-shadow: none !important;
              border: none !important;
              background: #fff !important;
              color: #000 !important;
              font-size: 11px !important;
            }
            @page {
              size: 80mm auto;
              margin: 0;
            }
          }
        `}</style>

        {/* Printable Area styled for 80mm receipt */}
        <div
          id="reconciliation-print-receipt"
          ref={printAreaRef}
          className="mx-auto max-w-[340px] rounded-lg border border-dashed border-gray-300 bg-white p-4 font-mono text-xs text-gray-900 shadow-sm print:m-0 print:w-full print:border-none print:p-0"
        >
          <div className="border-b border-gray-400 pb-2 text-center">
            <h2 className="text-sm font-black">{shopName}</h2>
            <p className="text-[11px] font-bold">إيصال مطابقة وإقفال الصندوق اليومي</p>
            <p className="text-[10px] text-gray-600">التاريخ: {summary.date}</p>
          </div>

          {/* Sales Breakdown by Employee */}
          <div className="my-2 border-b border-dashed border-gray-300 pb-2">
            <p className="mb-1 font-bold">مبيعات الموظفين:</p>
            {summary.employee_breakdown.map((emp, i) => (
              <div key={i} className="flex justify-between py-0.5">
                <span>
                  {emp.employee_name} ({emp.invoice_count} ف):
                </span>
                <span className="font-bold">{emp.total_sales.toFixed(2)}</span>
              </div>
            ))}
          </div>

          {/* Totals Summary */}
          <div className="space-y-1 border-b border-dashed border-gray-300 pb-2">
            <div className="flex justify-between font-bold">
              <span>إجمالي المبيعات:</span>
              <span>{summary.total_sales.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between">
              <span>مبيعات الشبكة (مدى):</span>
              <span>{summary.card_sales.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>مبيعات الكاش:</span>
              <span>{summary.cash_sales.toFixed(2)}</span>
            </div>
            {summary.transfer_sales > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>مبيعات تحويل بنكي:</span>
                <span>{summary.transfer_sales.toFixed(2)}</span>
              </div>
            )}
            {summary.credit_sales && summary.credit_sales > 0 ? (
              <div className="flex justify-between text-purple-600">
                <span>مبيعات آجلة (ذمم):</span>
                <span>{summary.credit_sales.toFixed(2)}</span>
              </div>
            ) : null}
            {summary.cash_receipts && summary.cash_receipts > 0 ? (
              <div className="flex justify-between text-emerald-600">
                <span>سندات قبض نقدية:</span>
                <span>+{summary.cash_receipts.toFixed(2)}</span>
              </div>
            ) : null}
            {summary.cash_disbursements && summary.cash_disbursements > 0 ? (
              <div className="flex justify-between text-red-600">
                <span>سندات صرف نقدية:</span>
                <span>-{summary.cash_disbursements.toFixed(2)}</span>
              </div>
            ) : null}
            {summary.returns_cash > 0 && (
              <div className="flex justify-between text-red-600">
                <span>مرتجع نقدي:</span>
                <span>-{summary.returns_cash.toFixed(2)}</span>
              </div>
            )}
            {summary.petty_expenses_cash > 0 && (
              <div className="flex justify-between text-red-600">
                <span>مصروفات من الدرج:</span>
                <span>-{summary.petty_expenses_cash.toFixed(2)}</span>
              </div>
            )}
            {summary.opening_float > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>عهدة فكة الصباح:</span>
                <span>+{summary.opening_float.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Drawer Reconciliation */}
          <div className="my-2 space-y-1 border-b border-gray-400 pb-2">
            <div className="flex justify-between">
              <span>الكاش المتوقع بالدرج:</span>
              <span className="font-bold">{summary.expected_cash_in_drawer.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-black">
              <span>الكاش الفعلي الموجود:</span>
              <span>{actualCash.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>فارق الكاش:</span>
              <span>
                {cashVariance === 0
                  ? '0.00 (متطابق)'
                  : `${cashVariance > 0 ? '+' : ''}${cashVariance.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>فارق الشبكة:</span>
              <span>{cardVariance === 0 ? 'مطابق' : cardVariance.toFixed(2)}</span>
            </div>
          </div>

          {/* Payout & Retained */}
          <div className="space-y-1 border-b border-gray-400 pb-2">
            <div className="flex justify-between">
              <span>فكة مستبقاة لصباح الغد:</span>
              <span className="font-bold">{floatRetained.toFixed(2)} ر.س</span>
            </div>
            <div className="flex justify-between text-sm font-black text-black">
              <span>المسلم للمالك / الخزينة:</span>
              <span>{cashToOwner.toFixed(2)} ر.س</span>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-4 space-y-3 pt-2 text-[10px]">
            <div className="flex justify-between">
              <span>توقيع الموظف (1): ............</span>
              <span>توقيع الموظف (2): ............</span>
            </div>
            <div className="pt-1 text-center">
              <span>توقيع المستلم / صاحب المحل: ....................</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-[var(--app-border)] pt-3 print:hidden">
          <Button variant="ghost" onClick={onClose}>
            إغلاق
          </Button>
          <Button variant="primary" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-4 w-4" />
            طباعة الإيصال
          </Button>
        </div>
      </div>
    </Modal>
  );
};
