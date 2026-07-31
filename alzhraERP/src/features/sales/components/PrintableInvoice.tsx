
import { useEffect, useState } from 'react';
import { formatCurrency } from '../../../core/utils';
import { useInvoiceSettings } from '../../settings/settingsStore';
import { useCompany } from '../../settings/hooks';

// Helper to ensure we always have a minimum number of rows for layout purposes
const padItems = (items: any[], minRows: number) => {
    const padded = [...items];
    while (padded.length < minRows) {
        padded.push({ id: `pad-${padded.length}`, name: '', quantity: '', price: '' });
    }
    return padded;
};

const PrintableInvoice = ({ invoice }: { invoice: any }) => {
    const { company: invoiceCompany, invoice_number, issue_date, party_name, items, total_amount, issuedBy } = invoice;
    const { data: settingsCompany, isLoading: _isCompanyLoading } = useCompany();
    const invoiceSettings = useInvoiceSettings();

    // Header State
    const [header, setHeader] = useState({
        nameAr: '',
        nameEn: '',
        address: '',
        taxNumber: '',
        specialization: '',
        phone: '',
        email: '',
        headerText: '',
        titleAr: 'فاتورة مبيعات',
        titleEn: 'Sales Invoice'
    });

    // Effect to initialize header from settings and profile
    useEffect(() => {
        const c = settingsCompany || invoiceCompany || {};

        setHeader(prev => ({
            ...prev,
            // Settings take high priority, then profile data
            nameAr: invoiceSettings.company_name_ar || c.name || c.name_ar || prev.nameAr || 'اسم المنشأة',
            nameEn: invoiceSettings.company_name_en || c.english_name || c.name_en || prev.nameEn || 'Company Name',
            address: invoiceSettings.company_address || c.address || prev.address || 'المملكة العربية السعودية',
            taxNumber: c.tax_number || prev.taxNumber || '---',
            specialization: invoiceSettings.company_specialization || prev.specialization,
            phone: invoiceSettings.company_phone || prev.phone,
            email: invoiceSettings.company_email || prev.email,
            headerText: invoiceSettings.invoice_header_text || prev.headerText
        }));
    }, [settingsCompany, invoiceCompany, invoiceSettings]);

    const displayItems = padItems(items.filter((i: any) => i.name), 10); // increased padding for better look

    return (
        <div id="invoice-printable-content" className="printable-area bg-white text-black font-sans">
            <style>{`
        @media print {
            body { background-color: white !important; }
            .no-print { display: none !important; }
            .printable-area {
                display: block !important;
                position: absolute;
                top: 0; left: 0; width: 100%; height: 100%;
                padding: 0; margin: 0; box-shadow: none; border: none;
            }
            @page { margin: 10mm; size: A4 portrait; }
        }
        .invoice-box {
            max-width: 210mm;
            margin: auto;
            padding: 10mm;
            background: white;
            font-family: 'Arial', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #000;
            line-height: 1.4;
            /* Force English numerals implicitly in modern browsers */
            font-variant-numeric: tabular-nums;
        }
        .inv-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            border-bottom: 2px solid #1F4E78; 
            padding-bottom: 10px; 
            margin-bottom: 15px; 
        }
        .inv-logo-area { text-align: center; }
        .inv-title { font-size: 22px; font-weight: 900; margin: 0; line-height: 1.2; color: #1F4E78; }
        .inv-subtitle { font-size: 13px; font-weight: bold; color: #444; }
        .inv-meta-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 15px; 
            margin-bottom: 20px; 
            font-size: 13px; 
            border: 1px solid #1F4E78; 
            border-radius: 4px;
            padding: 10px; 
            background-color: #FAFAFA;
        }
        .meta-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .inv-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px; 
            font-size: 13px; 
        }
        .inv-table th, .inv-table td {
            border: 1px solid #D3D3D3;
        }
        .inv-table th { 
            background: #1F4E78; 
            color: #FFFFFF;
            padding: 10px; 
            font-weight: bold; 
            text-align: center; 
        }
        .inv-table td { 
            padding: 8px; 
            text-align: center; 
        }
        .inv-table tr:nth-child(even) td {
            background-color: #F9F9F9;
        }
        .inv-table td.desc { text-align: right; }
        .inv-totals { display: flex; justify-content: flex-end; }
        .totals-box { width: 50%; border: 1px solid #D3D3D3; border-collapse: collapse; }
        .totals-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 10px; 
            border-bottom: 1px solid #D3D3D3; 
        }
        .totals-row.final { 
            border-bottom: none; 
            background: #EBF1DE; 
            font-weight: bold; 
            font-size: 15px; 
            color: #1F4E78;
        }
        .qr-section { margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
        .terms { font-size: 11px; color: #555; max-width: 60%; }
        .editable-field:hover { background: #f0f7ff; cursor: text; border-radius: 4px; }
        .edit-hint { 
            background: #eff6ff; 
            border: 1px solid #dbeafe; 
            padding: 8px 12px; 
            border-radius: 8px; 
            margin-bottom: 15px; 
            font-size: 12px; 
            color: #1e40af; 
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 8px;
        }
      `}</style>

            <div className="invoice-box" dir="rtl">
                {/* Visual Hint - Screen Only */}
                <div className="edit-hint no-print">
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                    نصيحة: يمكنك النقر على أي نص في الترويسة (الاسم، العنوان، الرقم الضريبي، مسمى الفاتورة) لتعديله مباشرة قبل الطباعة.
                </div>

                {/* Header with Company Info */}
                <div className="inv-header">
                    <div className="text-right flex-1">
                        <h1
                            className="inv-title editable-field outline-none"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => setHeader(prev => ({ ...prev, nameAr: e.currentTarget.textContent || '' }))}
                        >
                            {header.nameAr || 'اسم الشركة'}
                        </h1>
                        <p
                            className="text-xs font-bold editable-field outline-none text-blue-800"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => setHeader(prev => ({ ...prev, specialization: e.currentTarget.textContent || '' }))}
                        >
                            {header.specialization}
                        </p>
                        <p
                            className="inv-subtitle editable-field outline-none mt-1"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => setHeader(prev => ({ ...prev, address: e.currentTarget.textContent || '' }))}
                        >
                            {header.address || 'العنوان غير مسجل'}
                        </p>
                        <div className="flex flex-col gap-1 mt-1 text-xs font-bold text-gray-700">
                            <span
                                className="editable-field outline-none"
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => setHeader(prev => ({ ...prev, phone: e.currentTarget.textContent || '' }))}
                            >
                                {header.phone ? `هاتف: ${header.phone}` : ''}
                            </span>
                            <span
                                className="editable-field outline-none"
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => setHeader(prev => ({ ...prev, taxNumber: e.currentTarget.textContent || '' }))}
                            >
                                {header.taxNumber ? `الرقم الضريبي: ${header.taxNumber}` : ''}
                            </span>
                        </div>
                    </div>

                    <div className="inv-logo-area flex-1">
                        {header.headerText && (
                            <p
                                className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest editable-field"
                                contentEditable
                                suppressContentEditableWarning
                                onBlur={(e) => setHeader(prev => ({ ...prev, headerText: e.currentTarget.textContent || '' }))}
                            >
                                {header.headerText}
                            </p>
                        )}
                        {/* Space for Logo if needed */}
                        <div className="h-16 w-32 border-2 border-dashed border-gray-300 mx-auto flex items-center justify-center text-gray-300 text-xs rounded no-print">
                            مساحة الشعار
                        </div>
                    </div>

                    <div className="text-left flex-1" dir="ltr">
                        <h1
                            className="inv-title editable-field outline-none"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => setHeader(prev => ({ ...prev, nameEn: e.currentTarget.textContent || '' }))}
                        >
                            {header.nameEn || 'Company Name'}
                        </h1>
                        <h2
                            className="text-lg font-bold mt-2 editable-field outline-none text-gray-800"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => setHeader(prev => ({ ...prev, titleEn: e.currentTarget.textContent || '' }))}
                        >
                            {header.titleEn}
                        </h2>
                        <h2
                            className="text-lg font-bold editable-field outline-none text-gray-800"
                            dir="rtl"
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => setHeader(prev => ({ ...prev, titleAr: e.currentTarget.textContent || '' }))}
                        >
                            {header.titleAr}
                        </h2>
                    </div>
                </div>

                <div className="inv-meta-grid">
                    <div>
                        <div className="meta-row"><strong>العميل:</strong> <span>{party_name}</span></div>
                        <div className="meta-row"><strong>العنوان:</strong> <span>-</span></div>
                        {issuedBy && <div className="meta-row"><strong>صدرت بواسطة:</strong> <span>{issuedBy}</span></div>}
                    </div>
                    <div>
                        <div className="meta-row"><strong>رقم الفاتورة:</strong> <span dir="ltr" className="font-bold">{invoice_number}</span></div>
                        <div className="meta-row"><strong>تاريخ الإصدار:</strong> <span dir="ltr">{issue_date}</span></div>
                    </div>
                </div>

                <table className="inv-table">
                    <thead>
                        <tr>
                            <th style={{ width: '5%' }}>#</th>
                            <th style={{ width: '40%' }}>وصف السلعة / الخدمة</th>
                            <th style={{ width: '15%' }}>الكمية</th>
                            <th style={{ width: '20%' }}>سعر الوحدة</th>
                            <th style={{ width: '20%' }}>الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayItems.map((item, i) => (
                            <tr key={item.id}>
                                <td>{item.name ? i + 1 : ''}</td>
                                <td className="desc">{item.name}</td>
                                <td dir="ltr">{item.quantity}</td>
                                <td dir="ltr">{item.price ? formatCurrency(item.price, invoice.currency_code || 'SAR') : ''}</td>
                                <td dir="ltr" className="font-bold">{item.price ? formatCurrency(Number(item.price) * Number(item.quantity), invoice.currency_code || 'SAR') : ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="inv-totals">
                    <div className="totals-box">
                        <div className="totals-row">
                            <span>المجموع الفرعي</span>
                            <span dir="ltr">{formatCurrency(total_amount, invoice.currency_code || 'SAR')}</span>
                        </div>
                        <div className="totals-row final">
                            <span>الإجمالي المستحق</span>
                            <span dir="ltr">{formatCurrency(total_amount, invoice.currency_code || 'SAR')}</span>
                        </div>
                    </div>
                </div>

                <div className="qr-section">
                    <div className="terms">
                        <strong>الشروط والأحكام:</strong>
                        <ul style={{ marginTop: '5px', paddingRight: '15px' }}>
                            <li>البضاعة المباعة لا ترد ولا تستبدل بعد 3 أيام.</li>
                            <li>يجب إحضار أصل الفاتورة عند الاسترجاع.</li>
                            <li>القطع الكهربائية لا ترد ولا تستبدل.</li>
                        </ul>
                    </div>
                    <div style={{ textAlign: 'center', width: '30%' }}>
                        <div style={{ borderBottom: '1px solid #000', marginBottom: '5px', paddingBottom: '30px' }}>التوقيع / الختم</div>
                        <div style={{ fontSize: '12px' }}>Signature / Stamp</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrintableInvoice;
