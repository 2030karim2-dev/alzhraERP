// ============================================
// Quotation Excel Exporter
// Professional styled Excel export for quotations
// ============================================

import * as _XLSX from 'xlsx-js-style';
const XLSX = (_XLSX as any).default || _XLSX;

interface QuotationExcelData {
    companyName: string;
    companyAddress?: string;
    taxNumber?: string;
    quotationNumber: string;
    issueDate: string;
    validUntil?: string;
    customerName: string;
    issuedBy: string;
    items: {
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
    subtotal: number;
    totalAmount: number;
    notes?: string;
}

export const generateQuotationWorkbook = (data: QuotationExcelData) => {
    const wb = XLSX.utils.book_new();
    const rows: any[][] = [];

    // --- Header Section ---
    rows.push([data.companyName]);
    rows.push([data.companyAddress || '']);
    rows.push([`الرقم الضريبي: ${data.taxNumber || '---'}`]);
    rows.push([]);
    rows.push([`عرض سعر رقم: ${data.quotationNumber}`]);
    rows.push([]);

    // --- Meta Info Section ---
    rows.push(['العميل:', data.customerName, '', 'رقم عرض السعر:', data.quotationNumber]);
    rows.push(['التاريخ:', data.issueDate, '', 'صالح حتى:', data.validUntil || '---']);
    rows.push(['صدر بواسطة:', data.issuedBy, '', '', '']);
    rows.push([]);

    // --- Table Header ---
    const tableHeader = ['#', 'وصف السلعة / الخدمة', 'الكمية', 'سعر الوحدة', 'الإجمالي'];
    rows.push(tableHeader);

    // --- Data Rows ---
    data.items.forEach((item, i) => {
        rows.push([
            i + 1,
            item.name,
            Number(item.quantity) || 0,
            Number(item.unitPrice) || 0,
            Number(item.total) || 0
        ]);
    });

    // --- Footer Summary ---
    rows.push([]);
    const summaryStartRow = rows.length;
    rows.push(['', '', '', 'المجموع الفرعي:', Number(data.subtotal) || 0]);
    rows.push(['', '', '', 'الإجمالي المستحق:', Number(data.totalAmount) || 0]);

    if (data.notes) {
        rows.push([]);
        rows.push(['ملاحظات:', data.notes]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // --- Styling ---
    ws['!cols'] = [
        { wch: 8 },   // #
        { wch: 45 },  // Description
        { wch: 15 },  // Quantity
        { wch: 20 },  // Unit Price
        { wch: 20 },  // Total
    ];

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Company Name
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Address
        { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // Tax
        { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } }, // Title
    ];

    if (data.notes) {
        ws['!merges'].push({ s: { r: rows.length - 1, c: 1 }, e: { r: rows.length - 1, c: 4 } });
    }

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:E1');
    for (let R = range.s.r; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[cellRef]) continue;

            // Default border and alignment
            ws[cellRef].s = {
                border: {
                    top: { style: 'thin', color: { rgb: 'D3D3D3' } },
                    bottom: { style: 'thin', color: { rgb: 'D3D3D3' } },
                    left: { style: 'thin', color: { rgb: 'D3D3D3' } },
                    right: { style: 'thin', color: { rgb: 'D3D3D3' } }
                },
                alignment: { horizontal: 'center', vertical: 'center' },
                font: { name: 'Arial', sz: 11, color: { rgb: '000000' } }
            };

            // English numerals
            if (typeof ws[cellRef].v === 'number') {
                ws[cellRef].z = '#,##0.00';
            }

            // Header (Company Name)
            if (R === 0) {
                ws[cellRef].s.font = { name: 'Arial', sz: 16, bold: true, color: { rgb: '1F4E78' } };
            }
            // Sub-headers
            if (R >= 1 && R <= 4) {
                ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true };
            }
            // Meta info keys
            if ((R >= 6 && R <= 8) && (C === 0 || C === 3)) {
                ws[cellRef].s.font = { name: 'Arial', sz: 11, bold: true };
                ws[cellRef].s.fill = { fgColor: { rgb: 'F2F2F2' } };
            }
            // Table Header styling
            if (R === 10) {
                ws[cellRef].s.fill = { fgColor: { rgb: '1F4E78' } };
                ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } };
            }
            // Footer summary
            if (R >= summaryStartRow && R <= summaryStartRow + 1) {
                if (C === 3) {
                    ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true };
                    ws[cellRef].s.fill = { fgColor: { rgb: 'F2F2F2' } };
                }
                if (C === 4) {
                    ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true, color: { rgb: '1F4E78' } };
                    ws[cellRef].s.fill = { fgColor: { rgb: 'EBF1DE' } };
                }
            }
            
            // Notes
            if (data.notes && R === rows.length - 1 && C === 0) {
                ws[cellRef].s.font = { name: 'Arial', sz: 11, bold: true };
            }
            
            // Alternating row colors for table data
            if (R > 10 && R < summaryStartRow - 1) {
                if (R % 2 === 1) {
                    ws[cellRef].s.fill = { fgColor: { rgb: 'FAFAFA' } };
                }
            }
        }
    }

    if (!ws['!props']) ws['!props'] = {};
    ws['!view'] = [{ RTL: true }];

    XLSX.utils.book_append_sheet(wb, ws, 'عرض سعر');
    return wb;
};

export const exportQuotationToExcel = (data: QuotationExcelData) => {
    const wb = generateQuotationWorkbook(data);
    XLSX.writeFile(wb, `عرض_سعر_${data.quotationNumber}.xlsx`);
};

export const generateQuotationExcelBlob = (data: QuotationExcelData): Blob => {
    const wb = generateQuotationWorkbook(data);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
