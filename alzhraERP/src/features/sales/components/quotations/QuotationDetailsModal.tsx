import React, { useState, useEffect } from 'react';
import { FileText, Send, CheckCircle, XCircle, ArrowRightLeft, Loader2, Clock, User, DollarSign, Calendar, Building2, Share2, Printer } from 'lucide-react';
import Modal from '../../../../ui/base/Modal';
import { salesQuotationsApi } from '../../api/quotationsApi';
import { formatCurrency } from '../../../../core/utils';
import type { QuotationStatus } from '../../types/quotation';
import { useSalesStore } from '../../store';
import { exportQuotationToExcel } from '../../../../core/utils/quotationExcelExporter';

interface Props {
  quotationId: string;
  onClose: () => void;
  onRefresh: () => void;
  onConvertToInvoice?: () => void;
}

const STATUS_ACTIONS: Record<string, { label: string; icon: React.ReactNode; color: string; nextStatus: string }[]> = {
  draft: [
    { label: 'إرسال للعميل', icon: <Send size={14} />, color: 'bg-blue-600 hover:bg-blue-700', nextStatus: 'sent' },
  ],
  sent: [
    { label: 'قبول', icon: <CheckCircle size={14} />, color: 'bg-emerald-600 hover:bg-emerald-700', nextStatus: 'accepted' },
    { label: 'رفض', icon: <XCircle size={14} />, color: 'bg-rose-600 hover:bg-rose-700', nextStatus: 'rejected' },
  ],
  accepted: [
    { label: 'تحويل لفاتورة', icon: <ArrowRightLeft size={14} />, color: 'bg-indigo-600 hover:bg-indigo-700', nextStatus: 'converted' },
  ],
};

const STATUS_LABELS: Record<QuotationStatus, { label: string; color: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300' },
  sent: { label: 'مُرسل', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  accepted: { label: 'مقبول', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  rejected: { label: 'مرفوض', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' },
  expired: { label: 'منتهي', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  converted: { label: 'تم التحويل', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
};

const QuotationDetailsModal: React.FC<Props> = ({ quotationId, onClose, onRefresh, onConvertToInvoice }) => {
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

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
        const { resetCart, setCustomer, setMetadata, calculateTotals } = useSalesStore.getState();
        resetCart();
        
        if (quotation.party) {
          setCustomer({ id: quotation.party.id, name: quotation.party.name, phone: quotation.party.phone });
        }
        
        setMetadata('invoiceType', 'credit'); // Quotations usually lead to credit or formal invoices
        
        if (quotation.quotation_items && quotation.quotation_items.length > 0) {
          const newItems = quotation.quotation_items.map((item: any) => ({
            id: crypto.randomUUID(),
            productId: item.product_id || '',
            sku: item.product?.sku || '',
            name: item.product?.name_ar || item.description || 'صنف غير محدد',
            partNumber: item.product?.part_number || '',
            brand: item.product?.brand || '',
            quantity: item.quantity || 1,
            basePrice: item.unit_price || 0,
            price: item.unit_price || 0,
            discount: 0, // Simplified for now
            costPrice: item.product?.cost_price || 0,
          }));
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
    return Math.ceil((new Date(quotation.valid_until).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const shareViaWhatsApp = async () => {
    if (!quotation) return;
    try {
      const { generateQuotationExcelBlob, exportQuotationToExcel } = await import('../../../../core/utils/quotationExcelExporter');
      
      const data = {
        companyName: 'الزهراء لقطع الغيار', // Ideally from context/settings
        quotationNumber: quotation.quotation_number,
        issueDate: quotation.issue_date,
        validUntil: quotation.valid_until,
        customerName: quotation.party?.name || 'عميل نقدي',
        issuedBy: 'النظام',
        items: quotation.quotation_items.map((it: any) => ({
          name: it.product?.name_ar || it.description,
          quantity: it.quantity,
          unitPrice: it.unit_price,
          total: it.total,
        })),
        subtotal: quotation.total_amount,
        totalAmount: quotation.total_amount,
      };

      const blob = generateQuotationExcelBlob(data);
      const file = new File([blob], `عرض_سعر_${quotation.quotation_number}.xlsx`, {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `عرض سعر ${quotation.quotation_number}`,
          text: `مرفق عرض سعر رقم ${quotation.quotation_number}`
        });
      } else {
        // Fallback
        exportQuotationToExcel(data);
        const text = encodeURIComponent(`مرفق عرض سعر رقم ${quotation.quotation_number}. يرجى الاطلاع على الملف المرفق.`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
      }
    } catch (err) {
      console.error('Share via WhatsApp failed', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const statusConf = STATUS_LABELS[(quotation?.status as QuotationStatus) || 'draft'];
  const actions = STATUS_ACTIONS[quotation?.status] || [];
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
        <div className="no-print w-full flex items-center gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            إغلاق
          </button>
          <div className="flex-1"></div>
          <button 
            onClick={() => {
              if (quotation) {
                exportQuotationToExcel({
                  companyName: 'الزهراء لقطع الغيار', // Ideally from context/settings
                  quotationNumber: quotation.quotation_number,
                  issueDate: quotation.issue_date,
                  validUntil: quotation.valid_until,
                  customerName: quotation.party?.name || 'عميل نقدي',
                  issuedBy: 'النظام',
                  items: quotation.quotation_items.map((it: any) => ({
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
            className="flex items-center gap-2 px-3 py-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors border border-emerald-100 dark:border-emerald-800/20"
          >
            <FileText size={16} />
            <span className="hidden sm:inline">إكسل</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-gray-100 dark:border-slate-800"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">طباعة</span>
          </button>
          <button 
            onClick={shareViaWhatsApp}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg transition-colors border border-emerald-100 dark:border-emerald-800/20"
          >
            <Share2 size={16} />
            <span className="hidden sm:inline">مشاركة واتساب</span>
          </button>
          {actions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => handleAction(action.nextStatus)}
              disabled={actionLoading}
              className={`flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${action.color}`}
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : action.icon}
              {action.label}
            </button>
          ))}
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
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : quotation ? (
        <div className="space-y-6 print-section">
          {/* Professional Print Header */}
          <div className="print-only mb-6 border-b-2 border-[#1F4E78] pb-4">
              <div className="flex justify-between items-center mb-4">
                  <div className="text-right flex-1">
                      <h1 className="text-xl font-bold text-[#1F4E78]">الزهراء لقطع الغيار</h1>
                      <div className="flex flex-col gap-1 mt-1 text-xs font-bold text-gray-700">
                          <span>هاتف: 0555555555</span>
                      </div>
                  </div>
                  <div className="flex-1 text-center">
                      <h2 className="text-xl font-bold text-gray-800 mt-2 bg-gray-100 inline-block px-4 py-1 rounded">عرض سعر</h2>
                  </div>
                  <div className="text-left flex-1" dir="ltr">
                      <h1 className="text-xl font-bold text-[#1F4E78]">Al-Zahra Spare Parts</h1>
                      <h2 className="text-md font-bold mt-2 text-gray-800">Quotation</h2>
                  </div>
              </div>
          </div>
          {/* Status & Validity Bar */}
          <div className="flex flex-wrap items-center gap-3 bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusConf.color}`}>
              {statusConf.label}
            </span>
            {daysLeft !== null && (
              <span className={`flex items-center gap-1 text-xs font-medium ${daysLeft <= 0 ? 'text-rose-500' : daysLeft <= 3 ? 'text-amber-500' : 'text-gray-500'}`}>
                <Clock size={12} />
                {daysLeft <= 0 ? 'انتهت الصلاحية' : `متبقي ${daysLeft} يوم`}
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Calendar size={12} />
              {new Date(quotation.issue_date).toLocaleDateString('ar-SA')}
            </span>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Customer */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
              <h3 className="font-bold text-gray-800 dark:text-slate-200 mb-3 flex items-center gap-2 text-sm border-b border-gray-100 dark:border-slate-800 pb-2">
                <User size={16} className="text-indigo-500" />
                معلومات العميل
              </h3>
              <p className="font-bold text-lg">{quotation.party?.name || 'عميل نقدي'}</p>
              {quotation.party?.phone && <p className="text-sm text-gray-500 mt-1">{quotation.party.phone}</p>}
            </div>

            {/* Amount */}
            <div className="bg-gradient-to-br from-indigo-500 to-blue-600 text-white p-4 rounded-2xl shadow-sm">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-sm border-b border-white/20 pb-2 text-indigo-100">
                <DollarSign size={16} />
                إجمالي العرض
              </h3>
              <p className="text-3xl font-bold font-mono" dir="ltr">
                {formatCurrency(quotation.total_amount, quotation.currency_code || 'SAR')}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-800 overflow-hidden">
            <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Building2 size={14} className="text-indigo-500" />
                بنود العرض ({quotation.quotation_items?.length || 0})
              </h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-800">
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">#</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">الوصف</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">الكمية</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">سعر الوحدة</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">خصم %</th>
                  <th className="text-right py-2.5 px-4 text-xs font-medium text-gray-500">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {quotation.quotation_items?.map((item: any, idx: number) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-2.5 px-4 text-xs text-gray-400">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-medium text-gray-900 dark:text-white">
                      {item.product?.name_ar || item.description}
                      {item.product?.sku && <span className="text-xs text-gray-400 block font-mono">{item.product.sku}</span>}
                    </td>
                    <td className="py-2.5 px-4 text-center">{item.quantity}</td>
                    <td className="py-2.5 px-4 font-mono text-center" dir="ltr">{formatCurrency(item.unit_price)}</td>
                    <td className="py-2.5 px-4 text-center">{item.discount_percent || 0}%</td>
                    <td className="py-2.5 px-4 font-mono font-bold text-center" dir="ltr">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Terms */}
          {(quotation.payment_terms || quotation.terms_and_conditions || quotation.notes) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quotation.payment_terms && (
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-gray-500 mb-1">شروط الدفع</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{quotation.payment_terms}</p>
                </div>
              )}
              {quotation.notes && (
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700">
                  <h4 className="text-xs font-bold text-gray-500 mb-1">ملاحظات</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{quotation.notes}</p>
                </div>
              )}
              {quotation.terms_and_conditions && (
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-xl border border-gray-100 dark:border-slate-700 md:col-span-2">
                  <h4 className="text-xs font-bold text-gray-500 mb-1">الشروط والأحكام</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{quotation.terms_and_conditions}</p>
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
