import React from 'react';
import { formatCurrency } from '../../../core/utils';
import { useCompany } from '../../settings/hooks';
import { useInvoiceSettings } from '../../settings/settingsStore';

export interface PurchasePrintParty {
  name: string | null;
  phone: string | null;
  address: string | null;
}

export interface PurchasePrintItem {
  id: string;
  description: string | null;
  quantity: number;
  unit_price: number;
  total: number;
  product: { name_ar: string | null; sku: string | null } | null;
}

export interface PurchasePrintInvoice {
  invoice_number: string | null;
  issue_date: string;
  due_date: string | null;
  party: PurchasePrintParty | null;
  invoice_items: PurchasePrintItem[] | null;
  subtotal: number | null;
  total_amount: number;
  notes: string | null;
}

interface CompanyPrintInfo {
  nameAr: string;
  nameEn: string;
  address: string;
  phone: string;
  taxNumber: string;
  specialization: string;
  headerText: string;
}

interface PurchaseInvoicePrintTemplateProps {
  invoice: PurchasePrintInvoice | null;
}

const printStyles = `
    @media print {
        body { background-color: white !important; }
        .no-print { display: none !important; }
        @page { margin: 10mm; size: auto; }
    }
    .purchases-print-box { font-family: 'Arial', 'Segoe UI', sans-serif; color: #111827 !important; background-color: #ffffff !important; font-variant-numeric: tabular-nums; }
    .grid-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; background-color: #ffffff !important; }
    .grid-table th, .grid-table td { border: 1px solid #D3D3D3; padding: 8px; color: #111827 !important; background-color: #ffffff !important; }
    .grid-table th { background-color: #1F4E78 !important; color: #FFFFFF !important; font-weight: bold; text-align: center; }
    .grid-table tr:nth-child(even) td { background-color: #F8FAFC !important; }
    .print-header { display: flex; justify-content: space-between; border-bottom: 2px solid #1F4E78; padding-bottom: 15px; margin-bottom: 20px; }
    .meta-box { border: 1px solid #1F4E78; background-color: #F8FAFC !important; padding: 10px; border-radius: 4px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 13px; color: #111827 !important; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 5px; color: #111827 !important; }
`;

const PrintHeader = ({ company }: { company: CompanyPrintInfo }): React.ReactElement => (
  <div className="print-header">
    <div className="flex-1 text-right">
      <h1 className="text-2xl font-bold text-[#1F4E78]">{company.nameAr}</h1>
      {company.specialization !== '' && (
        <p className="text-sm font-bold text-blue-800">{company.specialization}</p>
      )}
      <p className="mt-1 text-sm">{company.address}</p>
      <div className="mt-1 flex flex-col gap-1 text-xs font-bold text-gray-700">
        {company.phone !== '' && <span>هاتف: {company.phone}</span>}
        {company.taxNumber !== '' && <span>الرقم الضريبي: {company.taxNumber}</span>}
      </div>
    </div>
    <div className="flex-1 text-center">
      {company.headerText !== '' && (
        <p className="text-sm font-bold text-gray-500">{company.headerText}</p>
      )}
    </div>
    <div className="flex-1 text-left" dir="ltr">
      <h1 className="text-2xl font-bold text-[#1F4E78]">{company.nameEn}</h1>
      <h2 className="mt-2 text-lg font-bold text-gray-800">Purchase Invoice</h2>
      <h2 className="text-lg font-bold text-gray-800" dir="rtl">
        فاتورة مشتريات
      </h2>
    </div>
  </div>
);

const MetaInfo = ({ invoice }: { invoice: PurchasePrintInvoice }): React.ReactElement => (
  <div className="meta-box">
    <div>
      <div className="meta-row">
        <strong>المورد:</strong> <span>{invoice.party?.name ?? 'مورد عام'}</span>
      </div>
      <div className="meta-row">
        <strong>هاتف المورد:</strong> <span dir="ltr">{invoice.party?.phone ?? '-'}</span>
      </div>
      <div className="meta-row">
        <strong>العنوان:</strong> <span>{invoice.party?.address ?? '-'}</span>
      </div>
    </div>
    <div>
      <div className="meta-row">
        <strong>رقم الفاتورة:</strong>{' '}
        <span dir="ltr" className="font-bold">
          {invoice.invoice_number ?? '-'}
        </span>
      </div>
      <div className="meta-row">
        <strong>تاريخ الإصدار:</strong> <span dir="ltr">{invoice.issue_date}</span>
      </div>
      <div className="meta-row">
        <strong>تاريخ الاستحقاق:</strong>{' '}
        <span dir="ltr">{invoice.due_date ?? invoice.issue_date}</span>
      </div>
    </div>
  </div>
);

const ItemsTable = ({ items }: { items: PurchasePrintItem[] | null }): React.ReactElement => (
  <table className="grid-table">
    <thead>
      <tr>
        <th style={{ width: '5%' }}>#</th>
        <th style={{ width: '40%' }}>تفاصيل الصنف</th>
        <th style={{ width: '15%' }}>الكمية</th>
        <th style={{ width: '20%' }}>سعر الوحدة</th>
        <th style={{ width: '20%' }}>الإجمالي</th>
      </tr>
    </thead>
    <tbody>
      {items?.map((item, index) => (
        <tr key={item.id}>
          <td className="text-center">{index + 1}</td>
          <td>
            <div className="font-bold">{item.description ?? 'بدون وصف'}</div>
            {item.product?.sku !== null && item.product?.sku !== undefined && (
              <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>
            )}
          </td>
          <td className="text-center font-bold" dir="ltr">
            {item.quantity}
          </td>
          <td className="text-center" dir="ltr">
            {formatCurrency(item.unit_price)}
          </td>
          <td className="text-center font-bold" dir="ltr">
            {formatCurrency(item.total)}
          </td>
        </tr>
      ))}
      {(items === null || items.length === 0) && (
        <tr>
          <td colSpan={5} className="py-4 text-center">
            لا توجد أصناف
          </td>
        </tr>
      )}
    </tbody>
  </table>
);

const Totals = ({ invoice }: { invoice: PurchasePrintInvoice }): React.ReactElement => (
  <div className="mt-4 flex justify-end">
    <div className="w-1/2 border-collapse border border-[#D3D3D3]">
      <div className="flex justify-between border-b border-[#D3D3D3] p-2">
        <span>المجموع الفرعي</span>
        <span dir="ltr">{formatCurrency(invoice.subtotal ?? 0)}</span>
      </div>
      <div className="flex justify-between bg-[#EBF1DE] p-2 text-lg font-bold text-[#1F4E78]">
        <span>الإجمالي النهائي</span>
        <span dir="ltr">{formatCurrency(invoice.total_amount)}</span>
      </div>
    </div>
  </div>
);

const Signatures = (): React.ReactElement => (
  <div className="mt-16 flex justify-between border-t border-gray-400 pt-8">
    {['المشتريات', 'الحسابات', 'المدير العام'].map(label => (
      <div className="w-1/3 text-center" key={label}>
        <p className="mb-8 font-bold">{label}</p>
        <div className="mx-auto w-24 border-t border-black" />
      </div>
    ))}
  </div>
);

const PurchaseInvoicePrintTemplate = React.forwardRef<
  HTMLDivElement,
  PurchaseInvoicePrintTemplateProps
>(({ invoice }, ref) => {
  const { data: settingsCompany } = useCompany();
  const invoiceSettings = useInvoiceSettings();
  if (invoice === null) return null;

  const company: CompanyPrintInfo = {
    nameAr: invoiceSettings.company_name_ar,
    nameEn: invoiceSettings.company_name_en,
    address: invoiceSettings.company_address,
    phone: invoiceSettings.company_phone,
    taxNumber: settingsCompany?.tax_number ?? '',
    specialization: invoiceSettings.company_specialization,
    headerText: invoiceSettings.invoice_header_text,
  };

  return (
    <div ref={ref} className="mx-auto max-w-4xl bg-white font-sans text-black print:p-0" dir="rtl">
      <style>{printStyles}</style>
      <div className="purchases-print-box p-8">
        <PrintHeader company={company} />
        <MetaInfo invoice={invoice} />
        <ItemsTable items={invoice.invoice_items} />
        <Totals invoice={invoice} />
        {invoice.notes !== null && invoice.notes !== '' && (
          <div className="mt-6 border border-gray-300 bg-gray-50 p-4">
            <strong>ملاحظات:</strong>
            <p className="mt-2 text-sm">{invoice.notes}</p>
          </div>
        )}
        <Signatures />
      </div>
    </div>
  );
});

PurchaseInvoicePrintTemplate.displayName = 'PurchaseInvoicePrintTemplate';

export default PurchaseInvoicePrintTemplate;
