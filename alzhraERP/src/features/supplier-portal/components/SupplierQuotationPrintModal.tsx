import React from 'react';
import { Printer, X, Building2, FileText, CheckCircle2 } from 'lucide-react';
import Modal from '../../../ui/base/Modal';
import Button from '../../../ui/base/Button';
import { formatCurrency } from '../../../core/utils';
import type { PublicPortalContext } from '../types';

export interface QuotationPrintItem {
  id?: string | undefined;
  product_id?: string | null | undefined;
  description: string;
  oem_number?: string | null | undefined;
  brand?: string | null | undefined;
  quantity: number;
  unit_price: number;
  discount_percent?: number | null | undefined;
  total?: number | null | undefined;
  notes?: string | null | undefined;
}

export interface SupplierPrintQuotation {
  id?: string | undefined;
  quotation_number: string;
  issue_date: string;
  valid_until?: string | null | undefined;
  total_amount: number;
  currency_code?: string | undefined;
  status: string;
  notes?: string | null | undefined;
  delivery_terms?: string | null | undefined;
  payment_terms?: string | null | undefined;
  items?: QuotationPrintItem[] | undefined;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quotation: SupplierPrintQuotation | null;
  context: PublicPortalContext | null;
}

export const SupplierQuotationPrintModal: React.FC<Props> = ({
  isOpen,
  onClose,
  quotation,
  context,
}) => {
  if (!isOpen || !quotation || !context) return null;

  const { company, supplier } = context;
  const currency = quotation.currency_code || 'SAR';

  const handlePrint = () => {
    window.print();
  };

  const calculatedSubtotal = (quotation.items || []).reduce((acc, item) => {
    return acc + Number(item.quantity || 0) * Number(item.unit_price || 0);
  }, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
      <div className="space-y-4 text-right" dir="rtl">
        {/* Action Controls (Hidden on paper print) */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 print:hidden">
          <div className="flex items-center gap-2 text-emerald-400">
            <FileText size={18} />
            <h3 className="text-sm font-black text-white">وثيقة عرض السعر الرسمية</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-emerald-600 font-bold hover:bg-emerald-500"
            >
              <Printer size={15} />
              <span>طباعة / حفظ PDF</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Document Paper Sheet */}
        <div className="rounded-2xl border border-slate-700 bg-white p-6 text-slate-900 shadow-xl print:border-none print:p-0 print:shadow-none">
          {/* Document Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
            {/* Buyer Company Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {company.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name_ar || ''}
                    className="h-10 w-10 rounded-lg border object-contain p-0.5"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <Building2 size={18} />
                  </div>
                )}
                <div>
                  <h2 className="text-base font-black text-slate-950">
                    {company.name_ar || 'مؤسسة الزهراء'}
                  </h2>
                  <p className="text-[10px] font-medium text-slate-500">
                    إدارة المشتريات والتوريدات
                  </p>
                </div>
              </div>
              <div className="space-y-0.5 pt-1 text-[10px] text-slate-600">
                {company.phone && (
                  <p>
                    الهاتف: <span dir="ltr">{company.phone}</span>
                  </p>
                )}
                {company.tax_number && (
                  <p>
                    الرقم الضريبي: <span className="font-mono">{company.tax_number}</span>
                  </p>
                )}
                {company.address && <p>العنوان: {company.address}</p>}
              </div>
            </div>

            {/* Quotation Identity & Number */}
            <div className="text-left font-mono">
              <span className="inline-block rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-black text-white">
                عرض سعر توريد
              </span>
              <h3 className="mt-1.5 text-base font-black tracking-tight text-slate-900">
                {quotation.quotation_number}
              </h3>
              <div className="mt-1 space-y-0.5 text-[10px] text-slate-600">
                <p>
                  تاريخ التقديم: <span className="font-bold">{quotation.issue_date}</span>
                </p>
                {quotation.valid_until && (
                  <p>
                    صالح لغاية:{' '}
                    <span className="font-bold text-amber-700">{quotation.valid_until}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Supplier Info Badge */}
          <div className="my-3 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-500">
                بيانات المورد المقدم للعرض:
              </span>
              <p className="text-sm font-black text-slate-900">{supplier.name}</p>
              {supplier.commercial_registration && (
                <p className="font-mono text-[10px] text-slate-600">
                  س.ت: {supplier.commercial_registration}
                </p>
              )}
            </div>
            <div className="space-y-0.5 text-left font-mono text-[11px] text-slate-600">
              {supplier.phone && (
                <p>
                  هاتف: <span dir="ltr">{supplier.phone}</span>
                </p>
              )}
              {supplier.email && <p>إيميل: {supplier.email}</p>}
              {supplier.tax_number && <p>الرقم الضريبي: {supplier.tax_number}</p>}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-hidden rounded-xl border border-slate-300">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-100 font-bold text-slate-700">
                  <th className="w-10 p-2.5 text-center">#</th>
                  <th className="p-2.5">بيان الصنف / الوصف</th>
                  <th className="p-2.5 text-center">رقم القطعة (OEM)</th>
                  <th className="p-2.5 text-center">الكمية</th>
                  <th className="p-2.5 text-center">سعر الوحدة</th>
                  <th className="p-2.5 text-center">الخصم</th>
                  <th className="p-2.5 text-center">الإجمالي ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(quotation.items || []).map((item, idx) => {
                  const itemSubtotal = item.quantity * item.unit_price;
                  const discountAmount = (itemSubtotal * (item.discount_percent || 0)) / 100;
                  const lineTotal = item.total ?? itemSubtotal - discountAmount;

                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-mono text-[11px] text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-2.5 font-bold text-slate-900">
                        {item.description}
                        {item.notes && (
                          <p className="text-[10px] font-normal text-slate-500">{item.notes}</p>
                        )}
                      </td>
                      <td className="p-2.5 text-center font-mono font-bold text-slate-600">
                        {item.oem_number || '---'}
                      </td>
                      <td className="p-2.5 text-center font-mono font-black text-slate-900">
                        {item.quantity}
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-800">
                        {formatCurrency(item.unit_price, currency)}
                      </td>
                      <td className="p-2.5 text-center font-mono text-slate-600">
                        {item.discount_percent ? `${item.discount_percent}%` : '0%'}
                      </td>
                      <td className="p-2.5 text-center font-mono font-black text-emerald-700">
                        {formatCurrency(lineTotal, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals and Terms Summary */}
          <div className="mt-4 grid grid-cols-1 items-start gap-4 md:grid-cols-2">
            {/* Terms and Notes */}
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-700">
              <h4 className="text-xs font-black text-slate-900">الشروط والأحكام:</h4>
              {quotation.delivery_terms && (
                <p>
                  🚚 <strong>شروط التسليم:</strong> {quotation.delivery_terms}
                </p>
              )}
              {quotation.payment_terms && (
                <p>
                  💳 <strong>شروط الدفع:</strong> {quotation.payment_terms}
                </p>
              )}
              {quotation.notes && (
                <p>
                  📝 <strong>ملاحظات المورد:</strong> {quotation.notes}
                </p>
              )}
            </div>

            {/* Financial Summary Box */}
            <div className="space-y-1.5 rounded-xl border border-slate-300 bg-slate-100 p-3 font-mono text-xs">
              <div className="flex justify-between text-slate-600">
                <span>المجموع الفرعي:</span>
                <span className="font-bold">{formatCurrency(calculatedSubtotal, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-black text-emerald-800">
                <span>المجموع الإجمالي النهائي:</span>
                <span>{formatCurrency(quotation.total_amount, currency)}</span>
              </div>
            </div>
          </div>

          {/* Footer Official Note */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-3 text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600" />
              <span>تم إنشاء هذا المستند إلكترونياً وموثق برقم تسلسلي عبر بوابة الموردين</span>
            </div>
            <span>تاريخ الطباعة: {new Date().toLocaleDateString('ar-SA')}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default SupplierQuotationPrintModal;
