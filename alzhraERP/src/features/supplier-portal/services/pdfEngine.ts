import { formatCurrency } from '../../../core/utils';
import type { QuotationItemDraft } from '../types';

export interface PDFQuotationOptions {
  companyName: string;
  companyAddress?: string;
  companyTaxNumber?: string;
  supplierName: string;
  quotationNumber: string;
  revisionNumber: number;
  issueDate: string;
  validUntil?: string | null;
  currency: string;
  items: QuotationItemDraft[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  deliveryDays?: number;
  warrantyDays?: number;
  terms?: string | null;
  notes?: string | null;
}

export const generateQuotationPDF = async (options: PDFQuotationOptions): Promise<void> => {
  const [{ default: jsPDF }, QRCode] = await Promise.all([
    import('jspdf'),
    import('qrcode'),
  ]);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header Banner
  doc.setFillColor(79, 70, 229); // Indigo 600
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text('OFFICIAL VENDOR QUOTATION', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Doc #: ${options.quotationNumber} (Rev ${options.revisionNumber})`, pageWidth / 2, 18, { align: 'center' });

  y = 35;
  doc.setTextColor(30, 41, 59);

  // Metadata Box (Company vs Supplier)
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 30, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setFont('Helvetica', 'bold');
  doc.text('Client Organization:', 18, y + 8);
  doc.setFont('Helvetica', 'normal');
  doc.text(options.companyName || 'Al-Zahra Smart ERP', 18, y + 14);
  if (options.companyTaxNumber) {
    doc.text(`Tax / VAT #: ${options.companyTaxNumber}`, 18, y + 20);
  }

  doc.setFont('Helvetica', 'bold');
  doc.text('Supplier / Vendor:', pageWidth / 2 + 10, y + 8);
  doc.setFont('Helvetica', 'normal');
  doc.text(options.supplierName, pageWidth / 2 + 10, y + 14);
  doc.text(`Date: ${options.issueDate} | Valid: ${options.validUntil || '30 Days'}`, pageWidth / 2 + 10, y + 20);
  doc.text(`Delivery: ${options.deliveryDays || 3} Days | Currency: ${options.currency}`, pageWidth / 2 + 10, y + 26);

  y += 38;

  // Table Header
  doc.setFillColor(30, 27, 75); // Navy
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('Helvetica', 'bold');

  doc.text('#', 18, y + 5.5);
  doc.text('Item Description', 30, y + 5.5);
  doc.text('OEM / Part #', 95, y + 5.5);
  doc.text('Qty', 130, y + 5.5);
  doc.text('Unit Price', 150, y + 5.5);
  doc.text('Total', pageWidth - 20, y + 5.5, { align: 'right' });

  y += 8;
  doc.setTextColor(51, 65, 85);
  doc.setFont('Helvetica', 'normal');

  options.items.forEach((item, index) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    const isEven = index % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageWidth - 28, 7, 'F');
    }

    doc.setFontSize(8);
    doc.text(String(index + 1), 18, y + 5);
    const itemName = item.product_name.length > 32 ? item.product_name.substring(0, 32) + '...' : item.product_name;
    doc.text(itemName, 30, y + 5);
    doc.text(item.oem_number || '---', 95, y + 5);
    doc.text(`${item.quantity} ${item.unit_of_measure}`, 130, y + 5);
    doc.text(formatCurrency(item.unit_price, options.currency), 150, y + 5);
    doc.text(formatCurrency(item.total_price, options.currency), pageWidth - 20, y + 5, { align: 'right' });

    y += 7;
  });

  y += 6;
  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  // Totals Breakdown
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  const summaryX = pageWidth - 70;
  doc.setFontSize(9);
  doc.text('Subtotal:', summaryX, y);
  doc.text(formatCurrency(options.subtotal, options.currency), pageWidth - 20, y, { align: 'right' });
  y += 5;

  if (options.discountAmount > 0) {
    doc.text('Discount:', summaryX, y);
    doc.text(`-${formatCurrency(options.discountAmount, options.currency)}`, pageWidth - 20, y, { align: 'right' });
    y += 5;
  }

  if (options.taxAmount > 0) {
    doc.text('VAT / Tax:', summaryX, y);
    doc.text(formatCurrency(options.taxAmount, options.currency), pageWidth - 20, y, { align: 'right' });
    y += 5;
  }

  doc.setFillColor(241, 245, 249);
  doc.roundedRect(summaryX - 5, y - 1, 61, 8, 1, 1, 'F');
  doc.setFont('Helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Grand Total:', summaryX, y + 5);
  doc.text(formatCurrency(options.totalAmount, options.currency), pageWidth - 20, y + 5, { align: 'right' });

  // Generate QR verification code
  const verificationPayload = JSON.stringify({
    quotation: options.quotationNumber,
    rev: options.revisionNumber,
    total: options.totalAmount,
    currency: options.currency,
    supplier: options.supplierName,
    date: options.issueDate,
  });

  try {
    const qrDataUrl = await QRCode.toDataURL(verificationPayload, { width: 100, margin: 1 });
    doc.addImage(qrDataUrl, 'PNG', 16, y - 12, 24, 24);
    doc.setFontSize(7);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Scan for Document Verification', 16, y + 15);
  } catch (err) {
    // QR code fallback
  }

  // Footer notes / terms
  if (options.terms || options.notes) {
    y += 24;
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'bold');
    doc.text('Terms & Remarks:', 16, y);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(options.terms || options.notes || '', 16, y + 4, { maxWidth: pageWidth - 32 });
  }

  doc.save(`${options.quotationNumber || 'Quotation'}_Rev${options.revisionNumber}.pdf`);
};
