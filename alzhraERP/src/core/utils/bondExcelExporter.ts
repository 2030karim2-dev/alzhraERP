// ============================================
// Bond Excel Exporter
// Professional styled Excel export for bonds (receipts/payments)
// ============================================

import * as _XLSX from 'xlsx-js-style';
const XLSX = (_XLSX as any).default || _XLSX;

interface CompanyInfo {
    name_ar: string;
    address?: string;
    phone?: string;
    tax_number?: string;
}

export const generateSingleBondWorkbook = (
    company: CompanyInfo,
    bond: {
        payment_number: string;
        date: string;
        description: string;
        amount: number;
        currency_code: string;
        type: 'receipt' | 'payment' | 'transfer';
        party_name?: string;
        account_name: string;
        payment_method?: string;
    }
) => {
    const wb = XLSX.utils.book_new();
    const rows: any[][] = [];

    const bondTitle = bond.type === 'receipt' ? 'سند قبض' : bond.type === 'payment' ? 'سند صرف' : 'سند تحويل';
    const partyTitle = bond.type === 'receipt' ? 'استلمنا من:' : bond.type === 'payment' ? 'صرفنا إلى:' : 'الطرف:';

    // --- Header Section ---
    rows.push([company.name_ar]);
    rows.push([`${company.address || ''} | هاتف: ${company.phone || ''}`]);
    rows.push([`الرقم الضريبي: ${company.tax_number || '---'}`]);
    rows.push([]);
    rows.push([`${bondTitle} رقم: ${bond.payment_number}`]);
    rows.push([]);

    // --- Meta Info ---
    rows.push(['التاريخ:', bond.date, '', 'المبلغ:', Number(bond.amount) || 0]);
    rows.push(['العملة:', bond.currency_code, '', 'طريقة الدفع:', bond.payment_method || '-']);
    rows.push([]);
    rows.push([partyTitle, bond.party_name || '-', '', 'الحساب:', bond.account_name]);
    rows.push([]);
    rows.push(['البيان (وصف العملية):', bond.description]);
    rows.push([]);

    // We can also make a small table just to show it like an Excel grid.
    const tableHeader = ['المبلغ', 'العملة', 'البيان'];
    rows.push(tableHeader);
    rows.push([Number(bond.amount) || 0, bond.currency_code, bond.description]);

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // --- Styling ---
    ws['!cols'] = [
        { wch: 20 },  // Col 1
        { wch: 30 },  // Col 2
        { wch: 10 },  // Col 3
        { wch: 20 },  // Col 4
        { wch: 30 },  // Col 5
    ];

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Company Name
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Info
        { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // Tax
        { s: { r: 4, c: 0 }, e: { r: 4, c: 4 } }, // Title
        { s: { r: 10, c: 1 }, e: { r: 10, c: 4 } }, // Description merge
        { s: { r: 12, c: 2 }, e: { r: 12, c: 4 } }, // Table desc
        { s: { r: 13, c: 2 }, e: { r: 13, c: 4 } }, // Table desc val
    ];

    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:E15');
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

            // Headers
            if (R === 0) ws[cellRef].s.font = { name: 'Arial', sz: 16, bold: true, color: { rgb: '1F4E78' } };
            if (R >= 1 && R <= 4) ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true };
            
            // Meta info keys
            if ((R >= 6 && R <= 8) && (C === 0 || C === 3)) {
                ws[cellRef].s.font = { name: 'Arial', sz: 11, bold: true };
                ws[cellRef].s.fill = { fgColor: { rgb: 'F2F2F2' } };
            }
            if (R === 10 && C === 0) {
                ws[cellRef].s.font = { name: 'Arial', sz: 11, bold: true };
                ws[cellRef].s.fill = { fgColor: { rgb: 'F2F2F2' } };
            }

            // Table Header styling
            if (R === 12) {
                ws[cellRef].s.fill = { fgColor: { rgb: '1F4E78' } };
                ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } };
            }
        }
    }

    if (!ws['!props']) ws['!props'] = {};
    ws['!view'] = [{ RTL: true }];

    XLSX.utils.book_append_sheet(wb, ws, bondTitle);
    return wb;
};

export const exportSingleBondToExcel = (
    company: CompanyInfo,
    bond: {
        payment_number: string;
        date: string;
        description: string;
        amount: number;
        currency_code: string;
        type: 'receipt' | 'payment' | 'transfer';
        party_name?: string;
        account_name: string;
        payment_method?: string;
    }
) => {
    const bondTitle = bond.type === 'receipt' ? 'سند قبض' : bond.type === 'payment' ? 'سند صرف' : 'سند تحويل';
    const wb = generateSingleBondWorkbook(company, bond);
    XLSX.writeFile(wb, `${bondTitle}_${bond.payment_number}.xlsx`);
};

export const generateSingleBondExcelBlob = (
    company: CompanyInfo,
    bond: {
        payment_number: string;
        date: string;
        description: string;
        amount: number;
        currency_code: string;
        type: 'receipt' | 'payment' | 'transfer';
        party_name?: string;
        account_name: string;
        payment_method?: string;
    }
): Blob => {
    const wb = generateSingleBondWorkbook(company, bond);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

export const exportBondsListToExcel = (
    company: CompanyInfo,
    bonds: any[],
    listTitle: string = 'قائمة السندات'
) => {
    const wb = XLSX.utils.book_new();
    const rows: any[][] = [];

    // --- Header Section ---
    rows.push([company.name_ar]);
    rows.push([listTitle]);
    rows.push([]);
    rows.push(['تاريخ الاستخراج:', new Date().toLocaleDateString('en-GB')]);
    rows.push([]);

    // --- Table Header ---
    const tableHeader = ['#', 'رقم السند', 'تاريخ السند', 'نوع السند', 'الحساب', 'الطرف', 'المبلغ', 'العملة', 'طريقة الدفع', 'البيان'];
    rows.push(tableHeader);

    // --- Data Rows ---
    bonds.forEach((bond, i) => {
        const bondTypeAr = bond.type === 'receipt' ? 'قبض' : bond.type === 'payment' ? 'صرف' : 'تحويل';
        rows.push([
            i + 1,
            bond.payment_number,
            bond.date,
            bondTypeAr,
            bond.account_name || '-',
            bond.party_name || '-',
            Number(bond.amount) || 0,
            bond.currency_code,
            bond.payment_method || '-',
            bond.description
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);

    // --- Styling ---
    ws['!cols'] = [
        { wch: 6 },   // #
        { wch: 15 },  // Number
        { wch: 15 },  // Date
        { wch: 12 },  // Type
        { wch: 25 },  // Account
        { wch: 25 },  // Party
        { wch: 15 },  // Amount
        { wch: 10 },  // Currency
        { wch: 15 },  // Payment method
        { wch: 35 },  // Description
    ];

    ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Company Name
        { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // Title
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
                if (C === 0) {
                    ws[cellRef].z = '#,##0'; // Integer for index
                } else {
                    ws[cellRef].z = '#,##0.00';
                }
            }

            // Headers
            if (R === 0) ws[cellRef].s.font = { name: 'Arial', sz: 16, bold: true, color: { rgb: '1F4E78' } };
            if (R === 1) ws[cellRef].s.font = { name: 'Arial', sz: 14, bold: true };
            if (R === 3 && C === 0) {
                ws[cellRef].s.font = { name: 'Arial', sz: 11, bold: true };
                ws[cellRef].s.fill = { fgColor: { rgb: 'F2F2F2' } };
            }

            // Table Header styling
            if (R === 5) {
                ws[cellRef].s.fill = { fgColor: { rgb: '1F4E78' } };
                ws[cellRef].s.font = { name: 'Arial', sz: 12, bold: true, color: { rgb: 'FFFFFF' } };
            }
            
            // Alternating row colors
            if (R > 5 && R < rows.length) {
                if (R % 2 === 0) {
                    ws[cellRef].s.fill = { fgColor: { rgb: 'FAFAFA' } };
                }
            }
        }
    }

    if (!ws['!props']) ws['!props'] = {};
    ws['!view'] = [{ RTL: true }];

    XLSX.utils.book_append_sheet(wb, ws, listTitle);
    XLSX.writeFile(wb, `${listTitle}_${new Date().toISOString().split('T')[0]}.xlsx`);
};
