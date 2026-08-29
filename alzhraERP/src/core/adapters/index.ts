/**
 * =====================================================================
 * Universal Data Adapters (نظام محولات البيانات الموحد)
 * Al-Zahra Smart ERP - Single Cohesive Living Organism
 * 
 * Provides fail-safe, resilient normalization for common entities:
 * - Parties (Customers / Suppliers)
 * - Invoices & Invoice Items
 * - Products & Inventory
 * - Financial Accounts & Bonds
 * =====================================================================
 */

export interface NormalizedParty {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: 'customer' | 'supplier' | 'both';
  balance: number;
  currency: string;
  address: string;
  taxNumber: string;
  creditLimit: number;
}

export interface NormalizedInvoiceItem {
  id: string;
  productId: string;
  name: string;
  partNumber: string;
  sku: string;
  brand: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  returnedAt: string | null;
}

export interface NormalizedInvoice {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  type: 'sale' | 'purchase' | 'sale_return' | 'purchase_return' | 'quotation';
  status: 'draft' | 'posted' | 'paid' | 'partially_paid' | 'cancelled' | 'void';
  paymentMethod: 'cash' | 'credit' | 'bank' | 'cheque';
  currencyCode: string;
  exchangeRate: number;
  partyId: string | null;
  partyName: string;
  partyPhone: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  notes: string;
  items: NormalizedInvoiceItem[];
  branchId: string | null;
}

export interface NormalizedProduct {
  id: string;
  sku: string;
  partNumber: string;
  name: string;
  nameEn: string;
  brand: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice: number;
  stock: number;
  minStock: number;
  location: string;
  isActive: boolean;
}

// ── Parties Adapter ──────────────────────────────────────────────────────────
export const partyAdapter = {
  normalize(raw: any): NormalizedParty {
    if (!raw || typeof raw !== 'object') {
      return {
        id: '',
        name: 'عميل نقدي',
        phone: '',
        email: '',
        type: 'customer',
        balance: 0,
        currency: 'SAR',
        address: '',
        taxNumber: '',
        creditLimit: 0,
      };
    }

    const name =
      raw.name ||
      raw.party_name ||
      raw.party?.name ||
      raw.customer_name ||
      raw.supplier_name ||
      'عميل نقدي';

    const phone =
      raw.phone ||
      raw.party_phone ||
      raw.party?.phone ||
      raw.mobile ||
      '';

    const balance =
      Number(raw.balance) ||
      Number(raw.current_balance) ||
      Number(raw.total_debt) ||
      Number(raw.outstanding_balance) ||
      0;

    return {
      id: raw.id || raw.party_id || '',
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: raw.email || '',
      type: raw.type || 'customer',
      balance,
      currency: raw.currency || raw.currency_code || 'SAR',
      address: raw.address || '',
      taxNumber: raw.tax_number || raw.tax_no || '',
      creditLimit: Number(raw.credit_limit) || 0,
    };
  },

  getName(raw: any, fallback = 'عميل نقدي'): string {
    if (!raw) return fallback;
    if (typeof raw === 'string') return raw;
    return (
      raw.name ||
      raw.party_name ||
      raw.party?.name ||
      raw.customerName ||
      raw.customer_name ||
      fallback
    );
  },

  getPhone(raw: any): string {
    if (!raw) return '';
    return raw.phone || raw.party_phone || raw.party?.phone || raw.mobile || '';
  },
};

// ── Invoice Items Adapter ───────────────────────────────────────────────────
export const invoiceItemAdapter = {
  normalize(raw: any, index = 0): NormalizedInvoiceItem {
    if (!raw || typeof raw !== 'object') {
      return {
        id: `item-${index}`,
        productId: '',
        name: 'صنف غير محدد',
        partNumber: '---',
        sku: '---',
        brand: '',
        quantity: 1,
        unitPrice: 0,
        costPrice: 0,
        taxAmount: 0,
        discountAmount: 0,
        total: 0,
        returnedAt: null,
      };
    }

    const name =
      raw.description ||
      raw.name ||
      raw.name_ar ||
      raw.product?.name_ar ||
      raw.product?.name ||
      raw.productName ||
      'صنف غير محدد';

    const partNumber =
      raw.product?.part_number ||
      raw.part_number ||
      raw.partNumber ||
      raw.product?.sku ||
      raw.sku ||
      '---';

    const sku =
      raw.product?.sku ||
      raw.sku ||
      raw.product_sku ||
      '';

    const brand =
      raw.product?.brand ||
      raw.brand ||
      '';

    const quantity = Number(raw.quantity) || 0;
    const unitPrice = Number(raw.unit_price) || Number(raw.unitPrice) || Number(raw.price) || 0;
    const costPrice = Number(raw.cost_price) || Number(raw.costPrice) || 0;
    const taxAmount = Number(raw.tax_amount) || Number(raw.taxAmount) || 0;
    const discountAmount = Number(raw.discount_amount) || Number(raw.discountAmount) || 0;
    const total =
      Number(raw.total) ||
      (quantity * unitPrice - discountAmount + taxAmount) ||
      (quantity * unitPrice) ||
      0;

    return {
      id: raw.id || `item-${index}`,
      productId: raw.product_id || raw.productId || raw.product?.id || '',
      name: String(name).trim(),
      partNumber: String(partNumber).trim(),
      sku: String(sku).trim(),
      brand: String(brand).trim(),
      quantity,
      unitPrice,
      costPrice,
      taxAmount,
      discountAmount,
      total,
      returnedAt: raw.returned_at || raw.returnedAt || null,
    };
  },
};

// ── Invoices Adapter ────────────────────────────────────────────────────────
export const invoiceAdapter = {
  normalize(raw: any): NormalizedInvoice {
    if (!raw || typeof raw !== 'object') {
      return {
        id: '',
        invoiceNumber: '',
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        type: 'sale',
        status: 'draft',
        paymentMethod: 'cash',
        currencyCode: 'SAR',
        exchangeRate: 1,
        partyId: null,
        partyName: 'عميل نقدي',
        partyPhone: '',
        subtotal: 0,
        taxAmount: 0,
        discountAmount: 0,
        totalAmount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        notes: '',
        items: [],
        branchId: null,
      };
    }

    const rawItems: any[] =
      raw.invoice_items ||
      raw.items ||
      raw.invoiceItems ||
      [];

    const normalizedItems = rawItems.map((item, idx) => invoiceItemAdapter.normalize(item, idx));

    const totalAmount =
      Number(raw.total_amount) ||
      Number(raw.totalAmount) ||
      Number(raw.total) ||
      normalizedItems.reduce((acc, i) => acc + i.total, 0);

    const taxAmount = Number(raw.tax_amount) || Number(raw.taxAmount) || 0;
    const discountAmount = Number(raw.discount_amount) || Number(raw.discountAmount) || 0;
    const subtotal =
      Number(raw.subtotal) ||
      (totalAmount - taxAmount + discountAmount) ||
      totalAmount;

    const paidAmount = Number(raw.paid_amount) || Number(raw.paidAmount) || 0;
    const remainingAmount =
      Number(raw.remaining_amount) ||
      Number(raw.remainingAmount) ||
      Math.max(0, totalAmount - paidAmount);

    return {
      id: raw.id || '',
      invoiceNumber: raw.invoice_number || raw.invoiceNumber || '',
      issueDate: raw.issue_date || raw.issueDate || raw.date || '',
      dueDate: raw.due_date || raw.dueDate || raw.issue_date || '',
      type: raw.type || 'sale',
      status: raw.status || 'draft',
      paymentMethod: raw.payment_method || raw.paymentMethod || 'cash',
      currencyCode: raw.currency_code || raw.currencyCode || raw.currency || 'SAR',
      exchangeRate: Number(raw.exchange_rate) || Number(raw.exchangeRate) || 1,
      partyId: raw.party_id || raw.partyId || raw.parties?.id || null,
      partyName: partyAdapter.getName(raw.parties || raw.party || raw),
      partyPhone: partyAdapter.getPhone(raw.parties || raw.party || raw),
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      paidAmount,
      remainingAmount,
      notes: raw.notes || '',
      items: normalizedItems,
      branchId: raw.branch_id || raw.branchId || null,
    };
  },
};

// ── Products Adapter ────────────────────────────────────────────────────────
export const productAdapter = {
  normalize(raw: any): NormalizedProduct {
    if (!raw || typeof raw !== 'object') {
      return {
        id: '',
        sku: '---',
        partNumber: '---',
        name: 'منتج غير محدد',
        nameEn: '',
        brand: '',
        category: '',
        costPrice: 0,
        sellingPrice: 0,
        wholesalePrice: 0,
        stock: 0,
        minStock: 0,
        location: '',
        isActive: true,
      };
    }

    const name =
      raw.name_ar ||
      raw.name ||
      raw.product_name ||
      raw.productName ||
      'منتج غير محدد';

    const partNumber =
      raw.part_number ||
      raw.partNumber ||
      raw.product_code ||
      raw.sku ||
      '---';

    const stock =
      Number(raw.quantity) ||
      Number(raw.stock) ||
      Number(raw.current_stock) ||
      Number(raw.available_quantity) ||
      0;

    return {
      id: raw.id || '',
      sku: raw.sku || '---',
      partNumber: String(partNumber).trim(),
      name: String(name).trim(),
      nameEn: raw.name_en || raw.nameEn || '',
      brand: raw.brand || '',
      category: raw.categories?.name || raw.category || '',
      costPrice: Number(raw.cost_price) || Number(raw.costPrice) || 0,
      sellingPrice: Number(raw.selling_price) || Number(raw.price) || Number(raw.unit_price) || 0,
      wholesalePrice: Number(raw.wholesale_price) || 0,
      stock,
      minStock: Number(raw.min_quantity) || Number(raw.min_stock) || 0,
      location: raw.location || raw.shelf_location || '',
      isActive: raw.is_active !== false,
    };
  },
};
