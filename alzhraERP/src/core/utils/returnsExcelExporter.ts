// ============================================
// Returns Excel Exporter
// Export returns data to Excel with professional styling
// ============================================

import * as _XLSX from 'xlsx-js-style';
const XLSX = (_XLSX as any).default || _XLSX;

interface ReturnExcelData {
    companyName: string;
    returns: {
        invoiceNumber: string;
        issueDate: string;
        customerName: string;
        supplierName?: string;
        referenceInvoice?: string;
        returnReason?: string;
        items: number;
        totalAmount: number;
        status: string;
        notes?: string;
    }[];
    summary: {
        totalReturns: number;
        totalAmount: number;
        averageAmount: number;
        count: number;
    };
    type: 'sales' | 'purchase';
}

// Helper to get Arabic status
const getStatusText = (status: string): string => {
    const statusMap: Record<string, string> = {
        'draft': 'مسودة',
        'posted': 'معتمد',
        'paid': 'مدفوع',
        'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
};

// Helper to get Arabic return reason
const getReturnReasonText = (reason: string): string => {
    const reasonMap: Record<string, string> = {
        'defective': 'منتج تالف',
        'not_as_described': 'غير مطابق للمواصفات',
        'wrong_item': 'صنف خاطئ',
        'quality_issue': 'مشكلة في الجودة',
        'changed_mind': 'تغيير رأي العميل',
        'expired': 'منتج منتهي الصلاحية',
        'other': 'أخرى'
    };
    return reasonMap[reason] || reason || '-';
};

export const exportReturnsToExcel = (data: ReturnExcelData) => {
    const wb = XLSX.utils.book_new();

    const isSales = data.type === 'sales';
    const title = isSales ? 'مرتجعات المبيعات' : 'مرتجعات المشتريات';
    const partyTitle = isSales ? 'العميل' : 'المورد';

    const rows: any[][] = [];

    // Header section
    rows.push([data.companyName]);
    rows.push([title]);
    rows.push([]);
    rows.push(['تاريخ التقرير:', new Date().toLocaleDateString('en-GB')]);
    rows.push([]);

    // Table headers
    const tableHeader = [
        '#',
        'رقم المرتجع',
        'التاريخ',
        partyTitle,
        'فاتورة مرجعية',
        'سبب الإرجاع',
        'عدد الأصناف',
        'المبلغ',
        'الحالة',
        'ملاحظات'
    ];
    rows.push(tableHeader);

    // Data rows
    data.returns.forEach((item, i) => {
        rows.push([
            i + 1,
            item.invoiceNumber,
            item.issueDate,
            item.customerName || item.supplierName || '-',
            item.referenceInvoice || '-',
            getReturnReasonText(item.returnReason || ''),
            Number(item.items) || 0,
            Number(item.totalAmount) || 0,
            getStatusText(item.status),
            item.notes || '-'
        ]);
    });

    rows.push([]);

    // Summary section
    const summaryStartRow = rows.length;
    rows.push(['ملخص الإحصائيات']);
    rows.push(['إجمالي عدد المرتجعات:', Number(data.summary.count) || 0]);
    rows.push(['إجمالي المبالغ المرتجعة:', Number(data.summary.totalAmount) || 0]);
    rows.push(['متوسط قيمة المرتجع:', Number(data.summary.averageAmount) || 0]);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
        { wch: 6 },   // #
        { wch: 18 },  // Invoice Number
        { wch: 15 },  // Date
        { wch: 30 },  // Customer/Supplier
        { wch: 18 },  // Reference Invoice
        { wch: 20 },  // Reason
        { wch: 12 },  // Items count
        { wch: 18 },  // Amount
        { wch: 15 },  // Status
        { wch: 35 },  // Notes
    ];

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Company name
        { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // Title
        { s: { r: summaryStartRow, c: 0 }, e: { r: summaryStartRow, c: 9 } } // Summary title
    ];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:J1');
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
                if (C === 0 || C === 6 || R >= summaryStartRow + 1) {
                    ws[cellRef].z = '#,##0'; // Integers
                } else if (C === 7) {
                    ws[cellRef].z = '#,##0.00'; // Decimals for amounts
                }
            }

            // Headers
            if (R === 0) ws[cellRef].s.font = { name: 'Arial', sz: 16, bold: true, color: { rgb: '1F4E78' } };
            if (R === 1) ws[cellRef].s.font = { name: 'Arial', sz: 14, bold: true };
            
            // Meta info
            if (R === 3 && C === 0) {
                ws[cellRef].s.font = { name: 'Arial', sz: 11, bold: true };
                ws[cellRef].s.fill = { fgColor: { rgb: 'F2F2F2' } };
            }

            // Table Header styling
            if (R === 5) {
                ws[cellRef].s.fill = { fgColor: { rgb: '1F4E78' } };
                ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } };
            }

            // Alternating row colors for table data
            if (R > 5 && R < summaryStartRow - 1) {
                if (R % 2 === 0) {
                    ws[cellRef].s.fill = { fgColor: { rgb: 'FAFAFA' } };
                }
            }

            // Summary Title
            if (R === summaryStartRow) {
                ws[cellRef].s.fill = { fgColor: { rgb: 'EBF1DE' } };
                ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true, color: { rgb: '1F4E78' } };
            }
            // Summary keys
            if (R > summaryStartRow && C === 0) {
                ws[cellRef].s.font = { name: 'Arial', sz: 11, bold: true };
                ws[cellRef].s.fill = { fgColor: { rgb: 'F2F2F2' } };
            }
        }
    }

    const sheetName = isSales ? 'مرتجعات المبيعات' : 'مرتجعات المشتريات';
    if (!ws['!props']) ws['!props'] = {};
    ws['!view'] = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const fileName = `${title}_${new Date().toISOString().split('T')[0]}`;
    XLSX.writeFile(wb, `${fileName}.xlsx`);
};

// Export single return to Excel (detailed)
export const exportSingleReturnToExcel = (data: {
    companyName: string;
    companyAddress?: string;
    invoiceNumber: string;
    issueDate: string;
    customerName: string;
    supplierName?: string;
    referenceInvoice?: string;
    returnReason?: string;
    issuedBy: string;
    status: string;
    items: {
        name: string;
        quantity: number;
        unitPrice: number;
        total: number;
    }[];
    subtotal: number;
    notes?: string;
    type: 'sales' | 'purchase';
}) => {
    const wb = XLSX.utils.book_new();

    const isSales = data.type === 'sales';
    const title = isSales ? 'مرتجع مبيعات' : 'مرتجع مشتريات';
    const partyTitle = isSales ? 'العميل' : 'المورد';
    const partyName = isSales ? data.customerName : data.supplierName || '';

    const rows: any[][] = [];

    // Header section
    rows.push([data.companyName]);
    rows.push([data.companyAddress || '']);
    rows.push([]);
    rows.push([`${title} رقم: ${data.invoiceNumber}`]);
    rows.push([]);

    // Meta info
    rows.push([`${partyTitle}:`, partyName, '', 'رقم المرتجع:', data.invoiceNumber]);
    rows.push(['التاريخ:', data.issueDate, '', 'الحالة:', getStatusText(data.status)]);
    if (data.referenceInvoice) {
        rows.push(['الفاتورة المرجعية:', data.referenceInvoice, '', 'سبب الإرجاع:', getReturnReasonText(data.returnReason || '')]);
    } else if (data.returnReason) {
        rows.push(['', '', '', 'سبب الإرجاع:', getReturnReasonText(data.returnReason)]);
    }
    rows.push(['صدرت بواسطة:', data.issuedBy]);
    rows.push([]);

    // Table header
    rows.push(['#', 'وصف الصنف', 'الكمية', 'سعر الوحدة', 'الإجمالي']);

    // Items
    data.items.forEach((item, i) => {
        rows.push([
            i + 1,
            item.name,
            Number(item.quantity) || 0,
            Number(item.unitPrice) || 0,
            Number(item.total) || 0
        ]);
    });

    rows.push([]);

    // Totals
    const notesStartRow = rows.length + 1;
    rows.push(['', '', '', 'المجموع:', Number(data.subtotal) || 0]);

    if (data.notes) {
        rows.push(['ملاحظات:', data.notes]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // Set column widths
    ws['!cols'] = [
        { wch: 8 },   // #
        { wch: 45 },  // Description
        { wch: 15 },  // Quantity
        { wch: 20 },  // Unit Price
        { wch: 20 },  // Total
    ];

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Company name
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Address
        { s: { r: 3, c: 0 }, e: { r: 3, c: 4 } }, // Title
    ];

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

            // Header
            if (R === 0) ws[cellRef].s.font = { name: 'Arial', sz: 16, bold: true, color: { rgb: '1F4E78' } };
            // Sub-headers
            if (R >= 1 && R <= 3) ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true };
            
            // Meta info keys
            if (R >= 5 && R <= 8 && (C === 0 || C === 3)) {
                ws[cellRef].s.font = { name: 'Arial', sz: 11, bold: true };
                ws[cellRef].s.fill = { fgColor: { rgb: 'F2F2F2' } };
            }

            // Table Header styling
            if (R === 10) {
                ws[cellRef].s.fill = { fgColor: { rgb: '1F4E78' } };
                ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } };
            }

            // Alternating rows
            if (R > 10 && R < rows.length - (data.notes ? 3 : 2)) {
                if (R % 2 === 1) {
                    ws[cellRef].s.fill = { fgColor: { rgb: 'FAFAFA' } };
                }
            }

            // Totals
            if (R === notesStartRow - 1) {
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
        }
    }

    const sheetName = isSales ? 'مرتجع مبيعات' : 'مرتجع مشتريات';
    if (!ws['!props']) ws['!props'] = {};
    ws['!view'] = [{ RTL: true }];
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    XLSX.writeFile(wb, `${title}_${data.invoiceNumber}.xlsx`);
};
