import React from 'react';
import { User, Building2, Phone, MapPin, Calendar, Package, FileText } from 'lucide-react';
import { formatCurrency, formatNumberDisplay } from '../../../core/utils';
import { useCompany } from '../../settings/hooks';
import { useInvoiceSettings } from '../../settings/settingsStore';

interface PurchaseInvoicePrintTemplateProps {
    invoice: any;
}

const PurchaseInvoicePrintTemplate = React.forwardRef<HTMLDivElement, PurchaseInvoicePrintTemplateProps>(
    ({ invoice }, ref) => {
        const { data: settingsCompany } = useCompany();
        const invoiceSettings = useInvoiceSettings();

        if (!invoice) return null;

        const company = {
            nameAr: invoiceSettings?.company_name_ar || settingsCompany?.name || 'اسم الشركة',
            nameEn: invoiceSettings?.company_name_en || settingsCompany?.english_name || 'Company Name',
            address: invoiceSettings?.company_address || settingsCompany?.address || '',
            phone: invoiceSettings?.company_phone || settingsCompany?.phone || '',
            taxNumber: settingsCompany?.tax_number || '---',
            specialization: invoiceSettings?.company_specialization || '',
            headerText: invoiceSettings?.invoice_header_text || ''
        };

        return (
            <div ref={ref} className="max-w-4xl mx-auto bg-white text-black font-sans print:p-0" dir="rtl">
                <style>{`
                @media print {
                    body { background-color: white !important; }
                    .no-print { display: none !important; }
                    @page { margin: 10mm; size: auto; }
                }
                .purchases-print-box {
                    font-family: 'Arial', 'Segoe UI', sans-serif;
                    color: #000;
                    font-variant-numeric: tabular-nums; /* Enforce standard english numbers */
                }
                .grid-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 20px;
                    font-size: 13px;
                }
                .grid-table th, .grid-table td {
                    border: 1px solid #D3D3D3;
                    padding: 8px;
                }
                .grid-table th {
                    background-color: #1F4E78;
                    color: #FFFFFF;
                    font-weight: bold;
                    text-align: center;
                }
                .grid-table tr:nth-child(even) td {
                    background-color: #FAFAFA;
                }
                .print-header {
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 2px solid #1F4E78;
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }
                .meta-box {
                    border: 1px solid #1F4E78;
                    background-color: #FAFAFA;
                    padding: 10px;
                    border-radius: 4px;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 20px;
                    font-size: 13px;
                }
                .meta-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                `}</style>
                <div className="purchases-print-box p-8">
                    {/* Header */}
                    <div className="print-header">
                        <div className="text-right flex-1">
                            <h1 className="text-2xl font-bold text-[#1F4E78]">{company.nameAr}</h1>
                            {company.specialization && <p className="text-sm font-bold text-blue-800">{company.specialization}</p>}
                            <p className="text-sm mt-1">{company.address}</p>
                            <div className="flex flex-col gap-1 mt-1 text-xs font-bold text-gray-700">
                                {company.phone && <span>هاتف: {company.phone}</span>}
                                {company.taxNumber && <span>الرقم الضريبي: {company.taxNumber}</span>}
                            </div>
                        </div>
                        <div className="flex-1 text-center">
                            {company.headerText && <p className="text-sm font-bold text-gray-500">{company.headerText}</p>}
                        </div>
                        <div className="text-left flex-1" dir="ltr">
                            <h1 className="text-2xl font-bold text-[#1F4E78]">{company.nameEn}</h1>
                            <h2 className="text-lg font-bold mt-2 text-gray-800">Purchase Invoice</h2>
                            <h2 className="text-lg font-bold text-gray-800" dir="rtl">فاتورة مشتريات</h2>
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="meta-box">
                        <div>
                            <div className="meta-row"><strong>المورد:</strong> <span>{invoice.party?.name || 'مورد عام'}</span></div>
                            <div className="meta-row"><strong>هاتف المورد:</strong> <span dir="ltr">{invoice.party?.phone || '-'}</span></div>
                            <div className="meta-row"><strong>العنوان:</strong> <span>{invoice.party?.address || '-'}</span></div>
                        </div>
                        <div>
                            <div className="meta-row"><strong>رقم الفاتورة:</strong> <span dir="ltr" className="font-bold">{invoice.invoice_number || '-'}</span></div>
                            <div className="meta-row"><strong>تاريخ الإصدار:</strong> <span dir="ltr">{invoice.issue_date}</span></div>
                            <div className="meta-row"><strong>تاريخ الاستحقاق:</strong> <span dir="ltr">{invoice.due_date || invoice.issue_date}</span></div>
                        </div>
                    </div>

                    {/* Items Table (Excel Grid) */}
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
                            {invoice.invoice_items?.map((item: any, index: number) => (
                                <tr key={item.id}>
                                    <td className="text-center">{index + 1}</td>
                                    <td>
                                        <div className="font-bold">{item.description || 'بدون وصف'}</div>
                                        {item.product?.sku && <div className="text-xs text-gray-500">SKU: {item.product.sku}</div>}
                                    </td>
                                    <td className="text-center font-bold" dir="ltr">{item.quantity}</td>
                                    <td className="text-center" dir="ltr">{formatCurrency(item.unit_price)}</td>
                                    <td className="text-center font-bold" dir="ltr">{formatCurrency(item.total)}</td>
                                </tr>
                            ))}
                            {(!invoice.invoice_items || invoice.invoice_items.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="text-center py-4">لا توجد أصناف</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Footer / Totals */}
                    <div className="flex justify-end mt-4">
                        <div className="w-1/2 border border-[#D3D3D3] border-collapse">
                            <div className="flex justify-between p-2 border-b border-[#D3D3D3]">
                                <span>المجموع الفرعي</span>
                                <span dir="ltr">{formatCurrency(invoice.subtotal)}</span>
                            </div>
                            <div className="flex justify-between p-2 bg-[#EBF1DE] text-[#1F4E78] font-bold text-lg">
                                <span>الإجمالي النهائي</span>
                                <span dir="ltr">{formatCurrency(invoice.total_amount)}</span>
                            </div>
                        </div>
                    </div>

                    {invoice.notes && (
                        <div className="mt-6 border border-gray-300 p-4 bg-gray-50">
                            <strong>ملاحظات:</strong>
                            <p className="mt-2 text-sm">{invoice.notes}</p>
                        </div>
                    )}

                    {/* Signatures */}
                    <div className="flex justify-between mt-16 pt-8 border-t border-gray-400">
                        <div className="text-center w-1/3">
                            <p className="font-bold mb-8">المشتريات</p>
                            <div className="border-t border-black w-24 mx-auto"></div>
                        </div>
                        <div className="text-center w-1/3">
                            <p className="font-bold mb-8">الحسابات</p>
                            <div className="border-t border-black w-24 mx-auto"></div>
                        </div>
                        <div className="text-center w-1/3">
                            <p className="font-bold mb-8">المدير العام</p>
                            <div className="border-t border-black w-24 mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

PurchaseInvoicePrintTemplate.displayName = 'PurchaseInvoicePrintTemplate';

export default PurchaseInvoicePrintTemplate;

