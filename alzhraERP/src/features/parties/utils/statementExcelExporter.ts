// ============================================
// Statement Excel Exporter - Professional Modern Edition
// Clean corporate design, styled cells, Arabic typography & English numerals
// — Uses the shared excelExporterBase lazy-loader + file-name sanitizer.
// ============================================

import { loadXLSX, sanitizeFileName } from '../../../core/utils/excelExporterBase';
import type { XlsxCell, XlsxSheet } from '../../../core/utils/excelExporterBase';

const getCell = (sheet: XlsxSheet, ref: string): XlsxCell | undefined => {
  // ref متغير ديناميكي وفق مواصفات xlsx — الوصول المقصود هنا غير قابل للفهرسة الثابتة.
  // eslint-disable-next-line security/detect-object-injection
  return sheet[ref] as XlsxCell | undefined;
};

export interface CompanyInfo {
  name_ar: string;
  address?: string;
  phone?: string;
  tax_number?: string;
  commercial_reg?: string;
  logo_url?: string;
  bank_name?: string;
  bank_account_iban?: string;
}

export interface StatementEntry {
  date: string;
  operation_type?: string;
  reference_no?: string;
  desc: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface StatementExportOptions {
  currencyCode?: string;
  dateFrom?: string;
  dateTo?: string;
  partyPhone?: string;
  partyCategory?: string;
}

export const generateStatementExcelWorkbook = async (
  company: CompanyInfo,
  partyName: string,
  entries: StatementEntry[],
  options: StatementExportOptions = {}
) => {
  const XLSX = await loadXLSX();
  const wb = XLSX.utils.book_new();
  const rows: any[][] = [];

  const currency = options.currencyCode || 'SAR';
  const todayFormatted = new Date().toLocaleDateString('en-GB');
  const dateRangeText =
    options.dateFrom && options.dateTo
      ? `الفترة من: ${options.dateFrom} إلى: ${options.dateTo}`
      : `حتى تاريخ: ${todayFormatted}`;

  // 1. Corporate Brand Header
  rows.push([company.name_ar || 'منظومة الزهراء المحاسبية']); // Row 0
  rows.push(['كشف حساب مالي تفصيلي | STATEMENT OF ACCOUNT']); // Row 1
  rows.push([
    `${company.address ? `📍 ${company.address}  |  ` : ''}${company.phone ? `📞 هاتف: ${company.phone}  |  ` : ''}${company.tax_number ? `الرقم الضريبي: ${company.tax_number}` : ''}`,
  ]); // Row 2
  rows.push([]); // Row 3 (Spacer)

  // 2. Client & Statement Metadata Card
  rows.push([
    `العميل / الجهة: ${partyName}`,
    '',
    '',
    `العملة: ${currency}`,
    '',
    `تاريخ التقرير: ${todayFormatted}`,
  ]); // Row 4
  rows.push([
    options.partyPhone
      ? `رقم الهاتف: ${options.partyPhone}`
      : `التصنيف: ${options.partyCategory || 'عميل'}`,
    '',
    '',
    dateRangeText,
    '',
    `عدد الحركات: ${entries.length}`,
  ]); // Row 5
  rows.push([]); // Row 6 (Spacer)

  // 3. Table Header
  const tableHeaderIndex = rows.length; // Row 7
  const tableHeader = [
    'م',
    'التاريخ',
    'نوع الحركة / السند',
    'رقم المرجع',
    'البيان والتفاصيل',
    'مدين (+)',
    'دائن (-)',
    `الرصيد (${currency})`,
  ];
  rows.push(tableHeader);

  // 4. Data Rows
  let totalDebit = 0;
  let totalCredit = 0;

  entries.forEach((entry, idx) => {
    const debit = Number(entry.debit) || 0;
    const credit = Number(entry.credit) || 0;
    const balance = Number(entry.balance) || 0;
    totalDebit += debit;
    totalCredit += credit;

    rows.push([
      idx + 1,
      entry.date || '',
      entry.operation_type || 'قيد محاسبي',
      entry.reference_no || '—',
      entry.desc || '—',
      debit,
      credit,
      balance,
    ]);
  });

  // 5. Total & Summary Footer
  const finalBalance = entries.length > 0 ? Number(entries[entries.length - 1].balance) || 0 : 0;
  const summaryRowIndex = rows.length; // Summary Row
  rows.push([
    'الإجمالي العام',
    '',
    '',
    '',
    `صافي الرصيد المستحق: ${finalBalance >= 0 ? 'متبقي على العميل (مدين)' : 'متبقي للعميل (دائن)'}`,
    totalDebit,
    totalCredit,
    finalBalance,
  ]);

  rows.push([]); // Spacer
  // 6. Bank & Payment Notes Footer
  if (company.bank_name || company.bank_account_iban) {
    rows.push([
      `📌 تعليمات السداد البنكي: البنك: ${company.bank_name || '—'} | الآيبان (IBAN): ${company.bank_account_iban || '—'}`,
    ]);
  }
  rows.push(['تم استخراج هذا الكشف آلياً من منظومة الزهراء لإدارة المبيعات والمحاسبة.']);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column Widths
  ws['!cols'] = [
    { wch: 6 }, // #
    { wch: 14 }, // Date
    { wch: 18 }, // Operation Type
    { wch: 16 }, // Reference
    { wch: 38 }, // Description
    { wch: 18 }, // Debit
    { wch: 18 }, // Credit
    { wch: 20 }, // Balance
  ];

  // Header Merges
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }, // Company Name
    { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } }, // Statement Title
    { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } }, // Company Info
    { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } }, // Client Name
    { s: { r: 4, c: 3 }, e: { r: 4, c: 4 } }, // Currency
    { s: { r: 4, c: 5 }, e: { r: 4, c: 7 } }, // Print Date
    { s: { r: 5, c: 0 }, e: { r: 5, c: 2 } }, // Client Phone
    { s: { r: 5, c: 3 }, e: { r: 5, c: 4 } }, // Date Range
    { s: { r: 5, c: 5 }, e: { r: 5, c: 7 } }, // Transaction Count
    { s: { r: summaryRowIndex, c: 0 }, e: { r: summaryRowIndex, c: 3 } }, // Summary Label
  ];

  if (company.bank_name || company.bank_account_iban) {
    ws['!merges'].push({
      s: { r: summaryRowIndex + 2, c: 0 },
      e: { r: summaryRowIndex + 2, c: 7 },
    });
    ws['!merges'].push({
      s: { r: summaryRowIndex + 3, c: 0 },
      e: { r: summaryRowIndex + 3, c: 7 },
    });
  } else {
    ws['!merges'].push({
      s: { r: summaryRowIndex + 2, c: 0 },
      e: { r: summaryRowIndex + 2, c: 7 },
    });
  }

  // Cell Styles
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:H1');
  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = getCell(ws, cellRef);
      if (cell === undefined) continue;

      // Base style
      cell.s = {
        border: {
          top: { style: 'thin', color: { rgb: 'E2E8F0' } },
          bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
          left: { style: 'thin', color: { rgb: 'E2E8F0' } },
          right: { style: 'thin', color: { rgb: 'E2E8F0' } },
        },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        font: { name: 'Calibri', sz: 10, color: { rgb: '1E293B' } },
      };

      // Number formatting in English numerals
      if (typeof cell.v === 'number') {
        if (C === 0) {
          cell.z = '0';
        } else {
          cell.z = '#,##0.00';
          cell.s.alignment = { horizontal: 'right', vertical: 'center' };
          cell.s.font = { name: 'Calibri', sz: 10.5, bold: false, color: { rgb: '0F172A' } };
        }
      }

      // 1. Company Main Header
      if (R === 0) {
        cell.s.font = { name: 'Calibri', sz: 16, bold: true, color: { rgb: 'FFFFFF' } };
        cell.s.fill = { fgColor: { rgb: '1E3A8A' } }; // Corporate Dark Blue
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      }

      // 2. Subtitle Header
      if (R === 1) {
        cell.s.font = { name: 'Calibri', sz: 12, bold: true, color: { rgb: 'FFFFFF' } };
        cell.s.fill = { fgColor: { rgb: '2563EB' } }; // Blue
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      }

      // 3. Company Contact Info
      if (R === 2) {
        cell.s.font = { name: 'Calibri', sz: 9.5, color: { rgb: '334155' } };
        cell.s.fill = { fgColor: { rgb: 'F1F5F9' } };
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      }

      // 4. Client Metadata Card
      if (R === 4 || R === 5) {
        cell.s.font = { name: 'Calibri', sz: 10, bold: true, color: { rgb: '1E293B' } };
        cell.s.fill = { fgColor: { rgb: 'F8FAFC' } };
        cell.s.alignment = { horizontal: C === 0 ? 'right' : 'center', vertical: 'center' };
      }

      // 5. Table Header Styling
      if (R === tableHeaderIndex) {
        cell.s.fill = { fgColor: { rgb: '0F172A' } }; // Slate 900
        cell.s.font = { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: 'FFFFFF' } };
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      }

      // 6. Data Rows
      if (R > tableHeaderIndex && R < summaryRowIndex) {
        if (C === 4) {
          // Description align right
          cell.s.alignment = { horizontal: 'right', vertical: 'center' };
        }
        // Balance column highlight
        if (C === 7) {
          cell.s.font = { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '1E3A8A' } };
          cell.s.fill = { fgColor: { rgb: 'EFF6FF' } }; // Light blue
        }
        // Zebra striping
        if (R % 2 === 0 && C !== 7) {
          cell.s.fill = { fgColor: { rgb: 'FAFAFA' } };
        }
      }

      // 7. Summary Footer Row
      if (R === summaryRowIndex) {
        cell.s.fill = { fgColor: { rgb: 'E2E8F0' } };
        cell.s.font = { name: 'Calibri', sz: 11, bold: true, color: { rgb: '0F172A' } };
        if (C === 7) {
          cell.s.fill = { fgColor: { rgb: 'DCFCE7' } }; // Light Green for final balance
          cell.s.font = { name: 'Calibri', sz: 12, bold: true, color: { rgb: '166534' } };
        }
      }

      // 8. Bank Notes & Bottom Footer
      if (R > summaryRowIndex) {
        cell.s.font = { name: 'Calibri', sz: 9, italic: true, color: { rgb: '64748B' } };
        cell.s.fill = { fgColor: { rgb: 'F8FAFC' } };
        cell.s.alignment = { horizontal: 'center', vertical: 'center' };
      }
    }
  }

  // Enable Right-to-Left (RTL) for Arabic
  if (!ws['!props']) ws['!props'] = {};
  ws['!views'] = [{ rightToLeft: true }];

  XLSX.utils.book_append_sheet(wb, ws, 'كشف الحساب المالي');
  return wb;
};

export const exportStatementToExcel = async (
  company: CompanyInfo,
  partyName: string,
  data: StatementEntry[],
  options: StatementExportOptions = {}
) => {
  try {
    const XLSX = await loadXLSX();
    const wb = await generateStatementExcelWorkbook(company, partyName, data, options);
    const safeName = sanitizeFileName(partyName);
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `كشف_حساب_${safeName}_${dateStr}.xlsx`);
  } catch (err) {
    throw new Error('فشل تصدير كشف الحساب إلى Excel');
  }
};

export const generateStatementExcelBlob = async (
  company: CompanyInfo,
  partyName: string,
  data: StatementEntry[],
  options: StatementExportOptions = {}
): Promise<Blob> => {
  try {
    const XLSX = await loadXLSX();
    const wb = await generateStatementExcelWorkbook(company, partyName, data, options);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer as BlobPart], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  } catch {
    throw new Error('فشل إنشاء ملف كشف الحساب');
  }
};
