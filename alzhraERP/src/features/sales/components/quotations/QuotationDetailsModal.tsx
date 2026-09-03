import React, { useState, useEffect } from 'react';
import {
  FileText,
  Send,
  CheckCircle,
  XCircle,
  ArrowRightLeft,
  Loader2,
  Clock,
  User,
  DollarSign,
  Calendar,
  Building2,
  Share2,
  Printer,
} from 'lucide-react';
import Modal from '../../../../ui/base/Modal';
import { salesQuotationsApi } from '../../api/quotationsApi';
import type { QuotationDetailRow, QuotationDetailItem } from '../../api/quotationsApi';
import { formatCurrency } from '../../../../core/utils';
import type { QuotationStatus } from '../../types/quotation';
import { useSalesStore } from '../../store';
import { exportQuotationToExcel } from '../../../../core/utils/quotationExcelExporter';
import { useCompany } from '../../../settings/hooks';
import { useAuthStore } from '../../../auth/store';
import { logger } from '../../../../core/utils/logger';

interface Props {
  quotationId: string;
  onClose: () => void;
  onRefresh: () => void;
  onConvertToInvoice?: () => void;
}

const STATUS_ACTIONS: Record<
  string,
  Array<{ label: string; icon: React.ReactNode; color: string; nextStatus: string }>
> = {
  draft: [
    {
      label: 'إرسال للعميل',
      icon: <Send size={14} />,
      color: 'bg-blue-600 hover:bg-blue-700',
      nextStatus: 'sent',
    },
  ],
  sent: [
    {
      label: 'قبول',
      icon: <CheckCircle size={14} />,
      color: 'bg-emerald-600 hover:bg-emerald-700',
      nextStatus: 'accepted',
    },
    {
      label: 'رفض',
      icon: <XCircle size={14} />,
      color: 'bg-rose-600 hover:bg-rose-700',
      nextStatus: 'rejected',
    },
  ],
  accepted: [
    {
      label: 'تحويل لفاتورة',
      icon: <ArrowRightLeft size={14} />,
      color: 'bg-indigo-600 hover:bg-indigo-700',
      nextStatus: 'converted',
    },
  ],
};

const STATUS_LABELS: Record<QuotationStatus, { label: string; color: string }> = {
  draft: {
    label: 'مسودة',
    color: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
  },
  sent: {
    label: 'مُرسل',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  accepted: {
    label: 'مقبول',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  rejected: {
    label: 'مرفوض',
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  },
  expired: {
    label: 'منتهي',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  pending: {
    label: 'قيد المراجعة',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  submitted: {
    label: 'مُقدم من المورد',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  converted: {
    label: 'تم التحويل',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
};

const QuotationDetailsModal: React.FC<Props> = ({
  quotationId,
  onClose,
  onRefresh,
  onConvertToInvoice,
}) => {
  const [quotation, setQuotation] = useState<QuotationDetailRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  // [FIX] جلب بيانات الشركة من قاعدة البيانات بدلاً من ترميز الاسم
  const { data: company } = useCompany();
  const { user } = useAuthStore();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const { data } = await salesQuotationsApi.getQuotationDetails(quotationId);
      setQuotation(data);
      setLoading(false);
    };
    fetch();
  }, [quotationId]);

  const handleAction = async (nextStatus: string) => {
    setActionLoading(true);
    try {
      if (nextStatus === 'converted') {
        if (!quotation) return;
        const { resetCart, setCustomer, setMetadata, calculateTotals } = useSalesStore.getState();
        resetCart();

        if (quotation.party) {
          const party = quotation.party;
          setCustomer({
            id: party.id,
            name: party.name,
            ...(party.phone ? { phone: party.phone } : {}),
          });
        }

        setMetadata('invoiceType', 'credit'); // Quotations usually lead to credit or formal invoices

        if (quotation.quotation_items && quotation.quotation_items.length > 0) {
          const newItems = quotation.quotation_items.map((item: QuotationDetailItem) => {
            const unitPrice = Number(item.unit_price) || 0;
            const discountAmount = item.discount_percent
              ? (unitPrice * Number(item.discount_percent)) / 100
              : 0;

            return {
              id: crypto.randomUUID(),
              productId: item.product_id || '',
              sku: item.product?.sku || '',
              name: item.product?.name_ar || item.description || 'صنف غير محدد',
              partNumber: item.product?.part_number || '',
              brand: item.product?.brand || '',
              quantity: Number(item.quantity) || 1,
              basePrice: unitPrice,
              price: unitPrice,
              discount: discountAmount,
              costPrice: Number(item.product?.cost_price) || 0,
            };
          });
          useSalesStore.setState({ items: newItems });
          calculateTotals();
        }

        await salesQuotationsApi.markAsConverted(quotationId);
        onClose();
        onConvertToInvoice?.();
        return;
      }

      await salesQuotationsApi.updateStatus(quotationId, nextStatus);
      const { data } = await salesQuotationsApi.getQuotationDetails(quotationId);
      setQuotation(data);
      onRefresh();
    } finally {
      setActionLoading(false);
    }
  };

  const getDaysRemaining = () => {
    if (!quotation?.valid_until) return null;
    return Math.ceil(
      (new Date(quotation.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
  };

  const shareViaWhatsApp = async () => {
    if (!quotation) return;
    try {
      const { generateQuotationExcelBlob, exportQuotationToExcel } =
        await import('../../../../core/utils/quotationExcelExporter');
      const { shareSpreadsheet } = await import('../../../../core/utils/shareUtils');

      const comp = (company || {}) as Record<string, unknown>;
      const resolvedCompanyName = (comp?.name_ar || comp?.name || 'الشركة') as string;
      const resolvedIssuedBy = user?.full_name || user?.email || 'النظام';
      const data = {
        companyName: resolvedCompanyName,
        quotationNumber: quotation.quotation_number,
        issueDate: quotation.issue_date,
        validUntil: quotation.valid_until ?? '',
        customerName: quotation.party?.name || 'عميل نقدي',
        issuedBy: resolvedIssuedBy,
        items: quotation.quotation_items.map((it: QuotationDetailItem) => ({
          name: it.product?.name_ar || it.description,
          quantity: it.quantity,
          unitPrice: it.unit_price,
          total: it.total,
        })),
        subtotal: quotation.total_amount,
        totalAmount: quotation.total_amount,
      };

      const blob = await generateQuotationExcelBlob(data);
      await shareSpreadsheet({
        blob,
        fileName: `عرض_سعر_${quotation.quotation_number}.xlsx`,
        shareTitle: `عرض سعر ${quotation.quotation_number}`,
        shareText: `مرفق عرض سعر رقم ${quotation.quotation_number}`,
        fallbackText: `مرفق عرض سعر رقم ${quotation.quotation_number}. يرجى الاطلاع على الملف المرفق.`,
        onDownloadFallback: () => exportQuotationToExcel(data),
      });
    } catch (err) {
      logger.error('QuotationDetailsModal', 'Share via WhatsApp failed', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const statusConf = STATUS_LABELS[(quotation?.status as QuotationStatus) || 'draft'];
  const actions = STATUS_ACTIONS[quotation?.status ?? ''] || [];
  const daysLeft = getDaysRemaining();

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      icon={FileText}
      title={quotation?.quotation_number || 'عرض سعر'}
      description="تفاصيل عرض السعر"
      size="xl"
      footer={
        <div className="no-print flex w-full flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-800 sm:px-4 sm:py-2 sm:text-sm"
          >
            إغلاق
          </button>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => {
                if (quotation) {
                  const comp2 = (company || {}) as Record<string, unknown>;
                  exportQuotationToExcel({
                    companyName: (comp2?.name_ar || comp2?.name || 'الشركة') as string,
                    quotationNumber: quotation.quotation_number,
                    issueDate: quotation.issue_date,
                    validUntil: quotation.valid_until ?? '',
                    customerName: quotation.party?.name || 'عميل نقدي',
                    issuedBy: user?.full_name || user?.email || 'النظام',
                    items: quotation.quotation_items.map((it: QuotationDetailItem) => ({
                      name: it.product?.name_ar || it.description,
                      quantity: it.quantity,
                      unitPrice: it.unit_price,
                      total: it.total,
                    })),
                    subtotal: quotation.total_amount,
                    totalAmount: quotation.total_amount,
                  });
                }
              }}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-100 px-2.5 py-1.5 text-xs text-emerald-600 transition-colors hover:bg-emerald-50 dark:border-emerald-800/20 dark:text-emerald-400 dark:hover:bg-emerald-900/20 sm:px-3 sm:py-2"
            >
              <FileText size={14} />
              <span>إكسل</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg border border-gray-100 px-2.5 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-100 dark:border-slate-800 dark:text-gray-400 dark:hover:bg-slate-800 sm:px-3 sm:py-2"
            >
              <Printer size={14} />
              <span>طباعة</span>
            </button>
            <button
              onClick={shareViaWhatsApp}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-600 transition-colors hover:bg-emerald-100 dark:border-emerald-800/20 dark:bg-emerald-900/20 dark:text-emerald-400 sm:px-3 sm:py-2"
            >
              <Share2 size={14} />
              <span>واتساب</span>
            </button>
            {actions.map(
              (
                action: { label: string; icon: React.ReactNode; color: string; nextStatus: string },
                idx: number
              ) => (
                <button
                  key={idx}
                  onClick={() => handleAction(action.nextStatus)}
                  disabled={actionLoading}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-50 sm:px-4 sm:py-2 sm:text-sm ${action.color}`}
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : action.icon}
                  {action.label}
                </button>
              )
            )}
          </div>
        </div>
      }
    >
      <style>{`
        @media print {
            body * { visibility: hidden; }
            .print-section, .print-section * { visibility: visible; }
            .print-section {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                font-family: 'Arial', sans-serif !important;
                color: #000 !important;
                background-color: white !important;
                font-variant-numeric: tabular-nums;
            }
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            table { border-collapse: collapse !important; width: 100% !important; }
            th, td { border: 1px solid #000 !important; padding: 6px !important; color: #000 !important; }
            th { background-color: #1F4E78 !important; color: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .print-only { display: none; }
      `}</style>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      ) : quotation ? (
        <div className="print-section space-y-6">
          {/* Professional Print Header */}
          <div className="print-only mb-6 border-b-2 border-[#1F4E78] pb-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex-1 text-right">
                {/* [FIX] استخدام اسم الشركة الحقيقي */}
                <h1 className="text-xl font-bold text-[#1F4E78]">
                  {String(
                    ((company ?? {}) as Record<string, unknown>).name_ar ||
                      ((company ?? {}) as Record<string, unknown>).name ||
                      'الشركة'
                  )}
                </h1>
                <div className="mt-1 flex flex-col gap-1 text-xs font-bold text-gray-700 max-md:gap-1">
                  <span>
                    {String(
                      ((company ?? {}) as Record<string, unknown>).phone
                        ? `هاتف: ${((company ?? {}) as Record<string, unknown>).phone}`
                        : ''
                    )}
                  </span>
                </div>
              </div>
              <div className="flex-1 text-center">
                <h2 className="mt-2 inline-block rounded bg-gray-100 px-4 py-1 text-xl font-bold text-gray-800">
                  عرض سعر
                </h2>
              </div>
              <div className="flex-1 text-left" dir="ltr">
                <h1 className="text-xl font-bold text-[#1F4E78]">
                  {String(
                    ((company ?? {}) as Record<string, unknown>).name_en ||
                      ((company ?? {}) as Record<string, unknown>).name ||
                      'Company'
                  )}
                </h1>
                <h2 className="text-md mt-2 font-bold text-gray-800">Quotation</h2>
              </div>
            </div>
          </div>
          {/* Status & Validity Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800 max-md:gap-3 max-md:p-4">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold max-md:gap-1.5 ${statusConf.color}`}
            >
              {statusConf.label}
            </span>
            {daysLeft !== null && (
              <span
                className={`flex items-center gap-1 text-xs font-medium max-md:gap-1 ${daysLeft <= 0 ? 'text-rose-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-gray-500'}`}
              >
                <Clock size={12} />
                {daysLeft <= 0 ? 'انتهت الصلاحية' : `متبقي ${daysLeft} يوم`}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 max-md:gap-1">
              <Calendar size={12} />
              {new Date(quotation.issue_date).toLocaleDateString('ar-SA-u-nu-latn')}
            </span>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-2">
            {/* Customer */}
            <div className="rounded-2xl border border-gray-100 bg-[var(--app-surface)] p-4 shadow-sm dark:border-slate-800 max-md:p-4">
              <h3 className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-2 text-sm font-bold text-gray-800 dark:border-slate-800 dark:text-slate-200 max-md:gap-2">
                <User size={16} className="text-indigo-500" />
                معلومات العميل
              </h3>
              <p className="text-lg font-bold">{quotation.party?.name || 'عميل نقدي'}</p>
              {quotation.party?.phone && (
                <p className="mt-1 text-sm text-gray-500">{quotation.party.phone}</p>
              )}
            </div>

            {/* Amount */}
            <div className="rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 p-4 text-white shadow-sm max-md:p-4">
              <h3 className="mb-3 flex items-center gap-2 border-b border-white/20 pb-2 text-sm font-bold text-indigo-100 max-md:gap-2">
                <DollarSign size={16} />
                إجمالي العرض
              </h3>
              <p className="font-mono text-3xl font-bold max-md:text-xl" dir="ltr">
                {formatCurrency(quotation.total_amount, quotation.currency_code || 'SAR')}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-[var(--app-surface)] dark:border-slate-800">
            <div className="border-b border-gray-100 bg-gray-50 p-3 dark:border-slate-800 dark:bg-slate-800/50 max-md:p-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 max-md:gap-2">
                <Building2 size={14} className="text-indigo-500" />
                بنود العرض ({quotation.quotation_items?.length || 0})
              </h3>
            </div>
            <div className="custom-scrollbar overflow-x-auto">
              <table className="w-full min-w-[500px] text-xs sm:min-w-full sm:text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-800">
                    <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-500 sm:px-4 sm:py-2.5 sm:text-xs">
                      #
                    </th>
                    <th className="px-3 py-2 text-right text-[11px] font-medium text-gray-500 sm:px-4 sm:py-2.5 sm:text-xs">
                      الوصف
                    </th>
                    <th className="px-3 py-2 text-center text-[11px] font-medium text-gray-500 sm:px-4 sm:py-2.5 sm:text-xs">
                      الكمية
                    </th>
                    <th className="px-3 py-2 text-center text-[11px] font-medium text-gray-500 sm:px-4 sm:py-2.5 sm:text-xs">
                      سعر الوحدة
                    </th>
                    <th className="px-3 py-2 text-center text-[11px] font-medium text-gray-500 sm:px-4 sm:py-2.5 sm:text-xs">
                      خصم %
                    </th>
                    <th className="px-3 py-2 text-center text-[11px] font-medium text-gray-500 sm:px-4 sm:py-2.5 sm:text-xs">
                      الإجمالي
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                  {quotation.quotation_items?.map((item: QuotationDetailItem, idx: number) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="px-3 py-2 text-[10px] text-gray-400 sm:px-4 sm:py-2.5 sm:text-xs">
                        {idx + 1}
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900 dark:text-white sm:px-4 sm:py-2.5">
                        {item.product?.name_ar || item.description}
                        {item.product?.sku && (
                          <span className="block font-mono text-[10px] text-gray-400 sm:text-xs">
                            {item.product.sku}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center font-bold sm:px-4 sm:py-2.5">
                        {item.quantity}
                      </td>
                      <td className="px-3 py-2 text-center font-mono sm:px-4 sm:py-2.5" dir="ltr">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-3 py-2 text-center sm:px-4 sm:py-2.5">
                        {item.discount_percent || 0}%
                      </td>
                      <td
                        className="px-3 py-2 text-center font-mono font-bold sm:px-4 sm:py-2.5"
                        dir="ltr"
                      >
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Terms */}
          {(quotation.payment_terms || quotation.terms_and_conditions || quotation.notes) && (
            <div className="grid grid-cols-1 gap-4 max-md:gap-4 md:grid-cols-2">
              {quotation.payment_terms && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800 max-md:p-4">
                  <h4 className="mb-1 text-xs font-bold text-gray-500">شروط الدفع</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {quotation.payment_terms}
                  </p>
                </div>
              )}
              {quotation.notes && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800 max-md:p-4">
                  <h4 className="mb-1 text-xs font-bold text-gray-500">ملاحظات</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{quotation.notes}</p>
                </div>
              )}
              {quotation.terms_and_conditions && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800 max-md:p-4 md:col-span-2">
                  <h4 className="mb-1 text-xs font-bold text-gray-500">الشروط والأحكام</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {quotation.terms_and_conditions}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </Modal>
  );
};

export default QuotationDetailsModal;
