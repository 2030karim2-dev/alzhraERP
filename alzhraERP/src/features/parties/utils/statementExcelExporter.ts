// ============================================
// Statement Excel Exporter
// Professional styled Excel export for party statements
// ============================================

import * as _XLSX from 'xlsx-js-style';
const XLSX = (_XLSX as any).default || _XLSX;

interface CompanyInfo {
    name_ar: string;
    address?: string;
    phone?: string;
    tax_number?: string;
    logo_url?: string;
}

interface StatementEntry {
    date: string;
    operation_type?: string;
    desc: string;
    debit: number;
    credit: number;
    balance: number;
}

export const generateStatementExcelWorkbook = (
    company: CompanyInfo,
    partyName: string,
    entries: StatementEntry[]
) => {
    const wb = XLSX.utils.book_new();
    const rows: any[][] = [];

    // --- Header Section ---
    rows.push([company.name_ar]);
    rows.push([`${company.address || ''} | هاتف: ${company.phone || ''}`]);
    rows.push([`الرقم الضريبي: ${company.tax_number || '---'}`]);
    rows.push([]);
    rows.push([`كشف حساب: ${partyName}`]);
    rows.push([`تاريخ الاستخراج: ${new Date().toLocaleDateString('en-GB')}`]);
    rows.push([]);

    // --- Table Header ---
    const tableHeader = ['التاريخ', 'نوع العملية', 'البيان', 'مدين', 'دائن', 'الرصيد'];
    rows.push(tableHeader);

    // --- Data Rows ---
    entries.forEach(entry => {
        rows.push([
            entry.date,
            entry.operation_type || 'قيد محاسبي',
            entry.desc,
            Number(entry.debit) || 0,
            Number(entry.credit) || 0,
            Number(entry.balance) || 0
        ]);
    });

    // --- Footer Summary ---
    rows.push([]);
    const totalDebit = entries.reduce((sum, e) => sum + (Number(e.debit) || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (Number(e.credit) || 0), 0);
    const finalBalance = entries.length > 0 ? (Number(entries[entries.length - 1].balance) || 0) : 0;

    rows.push(['', '', 'الإجمالي', totalDebit, totalCredit, finalBalance]);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // --- Styling ---
    ws['!cols'] = [
        { wch: 15 }, // Date
        { wch: 20 }, // Operation Type
        { wch: 45 }, // Description
        { wch: 18 }, // Debit
        { wch: 18 }, // Credit
        { wch: 18 }, // Balance
    ];

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Company Name
        { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Info
        { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // Tax
        { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } }, // Title
        { s: { r: 5, c: 0 }, e: { r: 5, c: 5 } }, // Export Date
    ];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:F1');
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

            // Enforce english numerals for numbers
            if (typeof ws[cellRef].v === 'number') {
                ws[cellRef].z = '#,##0.00';
            }

            // Header (Company Name)
            if (R === 0) {
                ws[cellRef].s.font = { name: 'Arial', sz: 16, bold: true, color: { rgb: '1F4E78' } };
            }
            // Sub-headers
            if (R >= 1 && R <= 5) {
                ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true };
            }
            // Table Header styling
            if (R === 7) {
                ws[cellRef].s.fill = { fgColor: { rgb: '1F4E78' } };
                ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } };
            }
            // Footer summary
            if (R === rows.length - 1) {
                if (C === 2) {
                    ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true };
                    ws[cellRef].s.fill = { fgColor: { rgb: 'F2F2F2' } };
                }
                if (C >= 3) {
                    ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true, color: { rgb: '1F4E78' } };
                    ws[cellRef].s.fill = { fgColor: { rgb: 'EBF1DE' } };
                }
            }
            
            // Alternating row colors for data
            if (R > 7 && R < rows.length - 2) {
                if (R % 2 === 0) {
                    ws[cellRef].s.fill = { fgColor: { rgb: 'FAFAFA' } };
                }
            }
        }
    }

    if (!ws['!props']) ws['!props'] = {};
    ws['!view'] = [{ RTL: true }];

    XLSX.utils.book_append_sheet(wb, ws, 'كشف الحساب');
    return wb;
};

export const exportStatementToExcel = (company: CompanyInfo, partyName: string, data: StatementEntry[]) => {
    const wb = generateStatementExcelWorkbook(company, partyName, data);
    XLSX.writeFile(wb, `كشف_حساب_${partyName}_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const generateStatementExcelBlob = (company: CompanyInfo, partyName: string, data: StatementEntry[]): Blob => {
    const wb = generateStatementExcelWorkbook(company, partyName, data);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};
