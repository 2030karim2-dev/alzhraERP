// ============================================
// Sales Requisitions Types (المطلوبات)
// ============================================

export interface RequisitionItem {
  id: string;
  productId?: string | undefined;
  name: string;
  partNumber: string;
  brand: string;
  quantity: number;
  notes?: string | undefined;
  unitPriceEstimate?: number | undefined;
}

export interface RequisitionSupplier {
  id?: string | undefined;
  name: string;
  phone?: string | undefined;
  notes?: string | undefined;
}

export interface RequisitionBatch {
  id: string;
  title: string;
  supplier?: RequisitionSupplier | undefined;
  items: RequisitionItem[];
  notes?: string | undefined;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'sent' | 'received';
}
