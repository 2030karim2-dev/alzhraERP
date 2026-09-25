import type { QuotationStatus } from '../../../sales/types/quotation';

export interface QuotationItemDetail {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  size: string | null;
  part_number: string | null;
  sku: string | null;
}

export interface QuotationListRow {
  id: string;
  quotation_number: string;
  status: QuotationStatus;
  total_amount: number;
  currency_code: string;
  rfq_group_id: string | null;
  created_at: string;
  supplier_name: string;
  items: QuotationItemDetail[];
  item_count: number;
}

export interface QuotationGroup {
  groupId: string;
  quotations: QuotationListRow[];
}

export const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

export const stringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

export const numberValue = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

export const relationName = (value: unknown): string => {
  const record = asRecord(value);
  if (record !== null) return stringValue(record.name, 'مورد غير محدد');
  if (Array.isArray(value)) return relationName(value[0]);
  return 'مورد غير محدد';
};

export const normalizeItemDetail = (value: unknown): QuotationItemDetail | null => {
  const row = asRecord(value);
  if (row === null) return null;
  const product = asRecord(row.product);
  const size = product ? stringValue(product.size) : stringValue(row.size);
  const partNumber = product ? stringValue(product.part_number) : '';
  const sku = product ? stringValue(product.sku) : '';
  return {
    id: stringValue(row.id),
    description: stringValue(row.description),
    quantity: numberValue(row.quantity),
    unit_price: numberValue(row.unit_price),
    total: numberValue(row.total),
    size: size.trim() !== '' ? size : null,
    part_number: partNumber.trim() !== '' ? partNumber : null,
    sku: sku.trim() !== '' ? sku : null,
  };
};

export const normalizeQuotation = (value: unknown): QuotationListRow | null => {
  const row = asRecord(value);
  if (row === null) return null;
  const id = stringValue(row.id);
  const status = stringValue(row.status, 'draft');
  const validStatuses: QuotationStatus[] = [
    'draft',
    'sent',
    'pending',
    'submitted',
    'accepted',
    'rejected',
    'expired',
    'converted',
  ];
  if (id === '' || !validStatuses.includes(status as QuotationStatus)) return null;
  const rawItems = Array.isArray(row.quotation_items) ? row.quotation_items : [];
  const items = rawItems
    .map(normalizeItemDetail)
    .filter((item): item is QuotationItemDetail => item !== null);
  return {
    id,
    quotation_number: stringValue(row.quotation_number),
    status: status as QuotationStatus,
    total_amount: numberValue(row.total_amount),
    currency_code: stringValue(row.currency_code, 'SAR'),
    rfq_group_id: typeof row.rfq_group_id === 'string' ? row.rfq_group_id : null,
    created_at: stringValue(row.created_at),
    supplier_name: relationName(row.party),
    items,
    item_count: items.length,
  };
};

export const normalizeQuotations = (value: unknown): QuotationListRow[] =>
  Array.isArray(value)
    ? value.map(normalizeQuotation).filter((row): row is QuotationListRow => row !== null)
    : [];

export const groupQuotations = (quotations: QuotationListRow[]): QuotationGroup[] => {
  const groups = new Map<string, QuotationListRow[]>();
  quotations.forEach(quotation => {
    const groupId = quotation.rfq_group_id ?? quotation.id;
    const group = groups.get(groupId) ?? [];
    group.push(quotation);
    groups.set(groupId, group);
  });
  return [...groups.entries()]
    .map(([groupId, groupedQuotations]) => ({ groupId, quotations: groupedQuotations }))
    .sort(
      (a, b) =>
        new Date(b.quotations[0]?.created_at ?? 0).getTime() -
        new Date(a.quotations[0]?.created_at ?? 0).getTime()
    );
};

export const matchesSearch = (group: QuotationGroup, term: string): boolean =>
  group.quotations.some(
    quotation =>
      quotation.quotation_number.toLowerCase().includes(term) ||
      quotation.supplier_name.toLowerCase().includes(term) ||
      quotation.items.some(
        item =>
          item.description.toLowerCase().includes(term) ||
          Boolean(item.part_number?.toLowerCase().includes(term)) ||
          Boolean(item.size?.toLowerCase().includes(term))
      )
  );
