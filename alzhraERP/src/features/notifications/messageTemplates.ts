// ============================================
// Message Templates for WhatsApp & Telegram
// ============================================

export type TransactionEvent = 'sale' | 'purchase' | 'bond_receipt' | 'bond_payment' | 'expense' | 'stock_transfer' | 'low_stock';

export interface SaleData {
    invoiceNumber: string;
    customerName: string;
    amount: number;
    currency: string;
    date: string;
    paymentMethod: string;
    itemCount: number;
}

export interface PurchaseData {
    invoiceNumber: string;
    supplierName: string;
    amount: number;
    currency: string;
    date: string;
    paymentMethod: string;
    itemCount: number;
}

export interface BondData {
    entryNumber: string | number;
    amount: number;
    currency: string;
    description: string;
    accountName: string;
    date: string;
}

export interface ExpenseData {
    voucherNumber?: string;
    category: string;
    amount: number;
    currency: string;
    description: string;
    date: string;
}

export interface StockTransferData {
    fromWarehouse: string;
    toWarehouse: string;
    itemCount: number;
    date: string;
}

export interface LowStockData {
    productName: string;
    currentStock: number;
    minLevel: number;
    warehouseName: string;
}

const formatCurrency = (amount: number, currency: string): string => {
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${currency}`;
};

const paymentMethodAr: Record<string, string> = {
    cash: 'نقداً',
    credit: 'آجل',
    bank: 'تحويل بنكي',
};

export const messageTemplates = {
    sale: (data: SaleData): string =>
        `🧾 فاتورة بيع جديدة #${data.invoiceNumber}
━━━━━━━━━━━━━━
👤 العميل: ${data.customerName}
💰 المبلغ: ${formatCurrency(data.amount, data.currency)}
📦 عدد الأصناف: ${data.itemCount}
💳 الدفع: ${paymentMethodAr[data.paymentMethod] || data.paymentMethod}
📅 التاريخ: ${data.date}`,

    purchase: (data: PurchaseData): string =>
        `📦 فاتورة شراء جديدة #${data.invoiceNumber}
━━━━━━━━━━━━━━
🏢 المورد: ${data.supplierName}
💰 المبلغ: ${formatCurrency(data.amount, data.currency)}
📦 عدد الأصناف: ${data.itemCount}
💳 الدفع: ${paymentMethodAr[data.paymentMethod] || data.paymentMethod}
📅 التاريخ: ${data.date}`,

    bond_receipt: (data: BondData): string =>
        `💵 سند قبض #${data.entryNumber}
━━━━━━━━━━━━━━
💰 المبلغ: ${formatCurrency(data.amount, data.currency)}
🏦 الحساب: ${data.accountName}
📝 البيان: ${data.description}
📅 التاريخ: ${data.date}`,

    bond_payment: (data: BondData): string =>
        `💸 سند صرف #${data.entryNumber}
━━━━━━━━━━━━━━
💰 المبلغ: ${formatCurrency(data.amount, data.currency)}
🏦 الحساب: ${data.accountName}
📝 البيان: ${data.description}
📅 التاريخ: ${data.date}`,

    expense: (data: ExpenseData): string =>
        `🏷️ مصروف جديد${data.voucherNumber ? ` #${data.voucherNumber}` : ''}
━━━━━━━━━━━━━━
📂 التصنيف: ${data.category}
💰 المبلغ: ${formatCurrency(data.amount, data.currency)}
📝 الوصف: ${data.description}
📅 التاريخ: ${data.date}`,

    stock_transfer: (data: StockTransferData): string =>
        `🔄 تحويل مخزون
━━━━━━━━━━━━━━
📤 من: ${data.fromWarehouse}
📥 إلى: ${data.toWarehouse}
📦 عدد الأصناف: ${data.itemCount}
📅 التاريخ: ${data.date}`,

    low_stock: (data: LowStockData): string =>
        `⚠️ تنبيه مخزون منخفض
━━━━━━━━━━━━━━
📦 المنتج: ${data.productName}
📊 الكمية الحالية: ${data.currentStock}
🔻 الحد الأدنى: ${data.minLevel}
🏭 المستودع: ${data.warehouseName}`,
};
