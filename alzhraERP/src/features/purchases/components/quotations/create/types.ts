import type { Party } from '../../../../parties/types';

/** بند واحد في عرض سعر المورد. */
export interface ItemRow {
  productId: string;
  description: string;
  partNumber?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

/** مورد مختار (مصغّر لتقليل حجم الحالة المحفوظة). */
export interface SupplierOption {
  id: Party['id'];
  name: Party['name'];
  phone: Party['phone'];
}

/** حالة نافذة اختيار المنتج لبند معيّن. */
export interface ProductModalState {
  isOpen: boolean;
  rowIndex: number;
  query: string;
}
