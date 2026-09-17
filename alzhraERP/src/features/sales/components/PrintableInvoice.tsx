import { useEffect, useState } from 'react';
import { formatCurrency } from '../../../core/utils';
import { tafqeet } from '../../../core/utils/tafqeet';
import { useInvoiceSettings } from '../../settings/settingsStore';
import { useCompany } from '../../settings/hooks';
import {
  PrintDocumentHeader,
  type HeaderLayoutMode,
  type CompanyHeaderData,
  type DocumentHeaderMeta,
} from './print/PrintDocumentHeader';
import { ZatcaInvoiceQRCode } from './print/ZatcaInvoiceQRCode';
import { PrintToolbar } from './print/PrintToolbar';

interface InvoiceItemDisplay {
  id?: string;
  name: string;
  sku?: string;
  part_number?: string;
  quantity: number | string;
  price: number | string;
  discount?: number | string;
  tax_amount?: number | string;
  total?: number | string;
}

interface PrintableInvoiceProps {
  invoice: any;
  onExportPDF?: (() => void) | undefined;
  isExporting?: boolean | undefined;
}

const PrintableInvoice: React.FC<PrintableInvoiceProps> = ({
  invoice,
  onExportPDF,
  isExporting = false,
}) => {
  if (!invoice) {
    return (
      <div className="flex h-48 items-center justify-center p-8 text-center text-slate-400">
        <p className="text-xs font-bold">جاري تجهيز الفاتورة للعرض والطباعة...</p>
      </div>
    );
  }

  const {
    company: invoiceCompany,
    invoice_number,
    issue_date,
    due_date,
    party_name,
    party_tax_number,
    party_phone,
    party_address,
    items = [],
    subtotal: rawSubtotal,
    discount_amount: rawDiscount,
    tax_amount: rawTax,
    total_amount,
    paid_amount,
    currency_code = 'SAR',
    payment_method,
    branch_name,
    issuedBy,
    type: invoiceType,
  } = invoice;

  const { data: settingsCompany } = useCompany();
  const invoiceSettings = useInvoiceSettings();

  // Print Configuration State
  const [layoutMode, setLayoutMode] = useState<HeaderLayoutMode>('modern-centered');
  const [accentColor, setAccentColor] = useState<string>('#1F4E78');
  const [showQrCode, setShowQrCode] = useState<boolean>(true);

  // Company Header Data State
  const [companyHeader, setCompanyHeader] = useState<CompanyHeaderData>({
    nameAr: '',
    nameEn: '',
    address: '',
    taxNumber: '',
    specialization: '',
    phone: '',
    crNumber: '',
    email: '',
    logoUrl: '',
    bannerUrl: '',
  });

  // Terms and conditions state (editable)
  const [termsList, setTermsList] = useState<string[]>([
    'البضاعة المباعة ترد أو تستبدل خلال 3 أيام بشرط سلامة العبوة الأصلية.',
    'القطع الكهربائية والإلكترونية خاضعة لسياسة الفحص ولا ترد بعد التركيب.',
    'يجب إحضار أصل هذه الفاتورة عند أي استرجاع أو استبدال أو مطالبة ضمان.',
  ]);

  useEffect(() => {
    const c = settingsCompany || invoiceCompany || {};

    setCompanyHeader(prev => ({
      ...prev,
      nameAr:
        invoiceSettings?.company_name_ar ||
        c.name_ar ||
        c.name ||
        prev.nameAr ||
        'اسم المنشأة التجارية',
      nameEn:
        invoiceSettings?.company_name_en ||
        c.name_en ||
        c.english_name ||
        prev.nameEn ||
        'Commercial Enterprise',
      address:
        invoiceSettings?.company_address || c.address || prev.address || 'المملكة العربية السعودية',
      taxNumber: c.tax_number || prev.taxNumber || '---',
      crNumber: c.cr_number || prev.crNumber || '',
      specialization:
        invoiceSettings?.company_specialization ||
        c.specialization ||
        prev.specialization ||
        'تجارة قطع غيار السيارات ومستلزماتها',
      phone: invoiceSettings?.company_phone || c.phone || prev.phone || '',
      email: invoiceSettings?.company_email || c.email || prev.email || '',
      logoUrl: prev.logoUrl || c.logo_url || '',
    }));
  }, [settingsCompany, invoiceCompany, invoiceSettings]);

  // Items formatting
  const displayItems: InvoiceItemDisplay[] = (items || [])
    .filter((i: any) => i && (i.name || i.description || i.product?.name_ar))
    .map((i: any) => ({
      id: i.id,
      name: i.name || i.product?.name_ar || i.description || 'صنف غير محدد',
      sku: i.sku || i.product?.sku || i.product?.part_number || '',
      part_number: i.part_number || i.product?.part_number || '',
      quantity: Number(i.quantity || 1),
      price: Number(i.price ?? i.unit_price ?? 0),
      discount: Number(i.discount || 0),
      tax_amount: Number(i.tax_amount || 0),
      total: Number(i.total ?? Number(i.price ?? i.unit_price ?? 0) * Number(i.quantity || 1)),
    }));

  // Calculations
  const calculatedTotal = Number(total_amount || 0);
  const calculatedTax =
    rawTax !== undefined ? Number(rawTax) : Math.round(calculatedTotal * (15 / 115) * 100) / 100;
  const calculatedSubtotal =
    rawSubtotal !== undefined ? Number(rawSubtotal) : calculatedTotal - calculatedTax;
  const calculatedDiscount = Number(rawDiscount || 0);
  const calculatedPaid = Number(paid_amount || 0);
  const remainingBalance = Math.max(0, calculatedTotal - calculatedPaid);

  const currencyUnit =
    currency_code === 'SAR' ? 'ريال سعودي' : currency_code === 'YER' ? 'ريال يمني' : currency_code;
  const tafqeetSentence = tafqeet(calculatedTotal, currencyUnit);

  const isReturn = invoiceType === 'sale_return';
  const documentTitle = isReturn ? 'إشعار دائن (فاتورة مرتجع مبيعات)' : 'فاتورة ضريبية مبسطة';
  const documentBadge = isReturn ? 'مرتجع مبيعات' : payment_method === 'credit' ? 'آجلة' : 'نقدية';

  const documentMeta: DocumentHeaderMeta = {
    titleAr: documentTitle,
    titleEn: isReturn ? 'Credit Note (Sales Return)' : 'Simplified Tax Invoice',
    documentNumber: invoice_number || 'INV-000',
    documentDate: issue_date || new Date().toISOString().split('T')[0],
    badge: documentBadge,
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="printable-invoice-container w-full bg-white font-sans text-black">
      {/* Styles for print and screen view */}
      <style>{`
        @media print {
            body { 
                background-color: white !important; 
                margin: 0 !important;
                padding: 0 !important;
            }
            .no-print { 
                display: none !important; 
            }
            .printable-invoice-container {
                display: block !important;
                width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
            }
            .invoice-page-box {
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
                border: none !important;
            }
            @page { 
                margin: 8mm; 
                size: A4 portrait; 
            }
            tr {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
            .avoid-break {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
            }
        }
        .invoice-page-box {
            max-width: 210mm;
            margin: auto;
            padding: 8mm 10mm;
            background: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            line-height: 1.45;
            font-variant-numeric: tabular-nums;
        }
        .inv-cell-header {
            background-color: ${accentColor} !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .inv-row-zebra:nth-child(even) {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .inv-total-highlight {
            background-color: #f0fdf4 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
      `}</style>

      {/* Screen-only Print Toolbar */}
      <PrintToolbar
        layoutMode={layoutMode}
        onChangeLayout={setLayoutMode}
        accentColor={accentColor}
        onChangeAccentColor={setAccentColor}
        showQrCode={showQrCode}
        onToggleQrCode={() => setShowQrCode(!showQrCode)}
        onPrint={handlePrint}
        onExportPDF={onExportPDF}
        isExporting={isExporting}
      />

      {/* Printable Invoice Page Box */}
      <div className="invoice-page-box" dir="rtl">
        {/* Document Header (Customizable & Configurable) */}
        <PrintDocumentHeader
          company={companyHeader}
          document={documentMeta}
          layoutMode={layoutMode}
          onUpdateCompany={updated => setCompanyHeader(prev => ({ ...prev, ...updated }))}
          accentColor={accentColor}
        />

        {/* Customer & Invoice Metadata Cards */}
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs">
          {/* Customer (Bill-To) Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: accentColor }}
              ></span>
              <span>بيانات العميل (Bill To):</span>
            </div>
            <div className="space-y-0.5 pr-3 text-slate-800">
              <p className="text-sm font-bold text-slate-900">{party_name || 'عميل نقدي'}</p>
              {party_tax_number && (
                <p className="text-[11px] text-slate-600">
                  <span className="font-semibold">الرقم الضريبي:</span> {party_tax_number}
                </p>
              )}
              {party_phone && (
                <p className="text-[11px] text-slate-600" dir="ltr">
                  <span className="font-semibold" dir="rtl">
                    الهاتف:{' '}
                  </span>
                  {party_phone}
                </p>
              )}
              {party_address && (
                <p className="text-[11px] text-slate-600">
                  <span className="font-semibold">العنوان:</span> {party_address}
                </p>
              )}
            </div>
          </div>

          {/* Invoice Specific Info */}
          <div className="space-y-1 border-r border-slate-200 pr-3">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: accentColor }}
              ></span>
              <span>تفاصيل العملية:</span>
            </div>
            <div className="space-y-0.5 pr-3 text-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">نوع الفاتورة:</span>
                <span className="font-bold">{payment_method === 'credit' ? 'آجل' : 'نقداً'}</span>
              </div>
              {branch_name && (
                <div className="flex justify-between">
                  <span className="text-slate-500">الفرع:</span>
                  <span className="font-semibold">{branch_name}</span>
                </div>
              )}
              {due_date && (
                <div className="flex justify-between">
                  <span className="text-slate-500">تاريخ الاستحقاق:</span>
                  <span className="font-mono" dir="ltr">
                    {due_date}
                  </span>
                </div>
              )}
              {issuedBy && (
                <div className="flex justify-between">
                  <span className="text-slate-500">المستخدم / البائع:</span>
                  <span className="font-semibold">{issuedBy}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Items Table */}
        <table className="mb-4 w-full border-collapse border border-slate-200 text-xs">
          <thead>
            <tr className="inv-cell-header text-center">
              <th
                className="border border-slate-300 px-1 py-2 text-center font-bold"
                style={{ width: '4%' }}
              >
                #
              </th>
              <th
                className="border border-slate-300 px-2 py-2 text-right font-bold"
                style={{ width: '42%' }}
              >
                بيان الصنف / الخدمة
              </th>
              <th
                className="border border-slate-300 px-2 py-2 text-center font-bold"
                style={{ width: '10%' }}
              >
                الكمية
              </th>
              <th
                className="border border-slate-300 px-2 py-2 text-center font-bold"
                style={{ width: '14%' }}
              >
                سعر الوحدة
              </th>
              <th
                className="border border-slate-300 px-2 py-2 text-center font-bold"
                style={{ width: '12%' }}
              >
                الضريبة (15%)
              </th>
              <th
                className="border border-slate-300 px-2 py-2 text-center font-bold"
                style={{ width: '18%' }}
              >
                الإجمالي شامل الضريبة
              </th>
            </tr>
          </thead>
          <tbody>
            {displayItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-slate-200 py-8 text-center text-slate-400">
                  لا توجد بنود في هذه الفاتورة
                </td>
              </tr>
            ) : (
              displayItems.map((item, index) => {
                const itemQty = Number(item.quantity);
                const itemPrice = Number(item.price);
                const itemTotal = Number(item.total);
                const itemVat = Math.round(itemTotal * (15 / 115) * 100) / 100;

                return (
                  <tr key={item.id || index} className="inv-row-zebra border-b border-slate-200">
                    <td className="border border-slate-200 px-1 py-1.5 text-center font-mono text-slate-500">
                      {index + 1}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold text-slate-900">
                      <div>{item.name}</div>
                      {(item.sku || item.part_number) && (
                        <div className="font-mono text-[10px] text-slate-500" dir="ltr">
                          {[item.sku, item.part_number].filter(Boolean).join(' | ')}
                        </div>
                      )}
                    </td>
                    <td
                      className="border border-slate-200 px-2 py-1.5 text-center font-mono font-bold text-slate-800"
                      dir="ltr"
                    >
                      {itemQty}
                    </td>
                    <td
                      className="border border-slate-200 px-2 py-1.5 text-center font-mono text-slate-700"
                      dir="ltr"
                    >
                      {formatCurrency(itemPrice, currency_code)}
                    </td>
                    <td
                      className="border border-slate-200 px-2 py-1.5 text-center font-mono text-slate-600"
                      dir="ltr"
                    >
                      {formatCurrency(itemVat, currency_code)}
                    </td>
                    <td
                      className="border border-slate-200 px-2 py-1.5 text-center font-mono font-black text-slate-900"
                      dir="ltr"
                    >
                      {formatCurrency(itemTotal, currency_code)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Financial Summary & QR Code Section */}
        <div className="avoid-break mb-4 flex flex-wrap items-start justify-between gap-4">
          {/* ZATCA QR Code & Amount in Words (Tafqeet) */}
          <div className="min-w-[240px] flex-1 space-y-2.5">
            <div className="flex items-center gap-3">
              {showQrCode && (
                <div className="shadow-2xs rounded border border-slate-200 bg-white p-1">
                  <ZatcaInvoiceQRCode
                    sellerName={companyHeader.nameAr}
                    vatNumber={companyHeader.taxNumber || '300000000000003'}
                    timestamp={issue_date || new Date().toISOString()}
                    totalAmount={calculatedTotal}
                    vatAmount={calculatedTax}
                    size={105}
                  />
                </div>
              )}
              <div className="space-y-1 text-xs">
                <div className="font-bold text-slate-700">المبلغ كتابةً:</div>
                <div className="rounded border border-slate-200 bg-slate-50 p-2 text-[11px] font-bold leading-relaxed text-slate-800">
                  {tafqeetSentence}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Totals Table */}
          <div className="w-full shrink-0 sm:w-72">
            <table className="w-full border-collapse border border-slate-200 text-xs">
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="px-3 py-1.5 font-semibold text-slate-600">المجموع قبل الضريبة:</td>
                  <td
                    className="px-3 py-1.5 text-left font-mono font-bold text-slate-800"
                    dir="ltr"
                  >
                    {formatCurrency(calculatedSubtotal, currency_code)}
                  </td>
                </tr>

                {calculatedDiscount > 0 && (
                  <tr className="border-b border-slate-200 text-rose-600">
                    <td className="px-3 py-1.5 font-semibold">إجمالي الخصم:</td>
                    <td className="px-3 py-1.5 text-left font-mono font-bold" dir="ltr">
                      -{formatCurrency(calculatedDiscount, currency_code)}
                    </td>
                  </tr>
                )}

                <tr className="border-b border-slate-200">
                  <td className="px-3 py-1.5 font-semibold text-slate-600">
                    ضريبة القيمة المضافة (15%):
                  </td>
                  <td
                    className="px-3 py-1.5 text-left font-mono font-bold text-slate-800"
                    dir="ltr"
                  >
                    {formatCurrency(calculatedTax, currency_code)}
                  </td>
                </tr>

                <tr className="inv-total-highlight border-b-2" style={{ borderColor: accentColor }}>
                  <td className="px-3 py-2 text-sm font-black" style={{ color: accentColor }}>
                    الصافي المستحق النهائي:
                  </td>
                  <td
                    className="px-3 py-2 text-left font-mono text-base font-black"
                    style={{ color: accentColor }}
                    dir="ltr"
                  >
                    {formatCurrency(calculatedTotal, currency_code)}
                  </td>
                </tr>

                {calculatedPaid > 0 && calculatedPaid !== calculatedTotal && (
                  <>
                    <tr className="border-b border-slate-200 text-emerald-700">
                      <td className="px-3 py-1 text-[11px] font-semibold">المبلغ المدفوع:</td>
                      <td className="px-3 py-1 text-left font-mono text-[11px] font-bold" dir="ltr">
                        {formatCurrency(calculatedPaid, currency_code)}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-200 text-amber-800">
                      <td className="px-3 py-1 text-[11px] font-bold">المتبقي:</td>
                      <td className="px-3 py-1 text-left font-mono text-[11px] font-bold" dir="ltr">
                        {formatCurrency(remainingBalance, currency_code)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Terms & Signatures */}
        <div className="avoid-break mt-6 border-t border-slate-200 pt-3 text-xs">
          <div className="grid grid-cols-3 items-end gap-4">
            {/* Terms List */}
            <div className="col-span-2 space-y-0.5 text-[10px] text-slate-500">
              <div className="mb-1 text-[11px] font-bold text-slate-700">
                الشروط والأحكام العامة:
              </div>
              <ul className="list-disc space-y-0.5 pr-3 leading-tight">
                {termsList.map((t, idx) => (
                  <li
                    key={idx}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={e => {
                      const updated = [...termsList];
                      updated[idx] = e.currentTarget.textContent || '';
                      setTermsList(updated);
                    }}
                  >
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Stamp & Signature */}
            <div className="flex flex-col items-center justify-center text-center">
              <div className="mb-2 h-16 w-36 border-b-2 border-dashed border-slate-400"></div>
              <span className="text-[11px] font-bold text-slate-700">الختم والتوقيع المعتمد</span>
              <span className="text-[10px] text-slate-400" dir="ltr">
                Official Stamp & Signature
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintableInvoice;
