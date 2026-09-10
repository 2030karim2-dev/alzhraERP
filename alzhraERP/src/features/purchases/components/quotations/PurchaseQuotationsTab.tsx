import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle,
  Clock,
  FileText,
  LayoutGrid,
  Loader2,
  Plus,
  Scale,
  Search,
  Send,
  Table as TableIcon,
  XCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { purchaseQuotationsApi } from '../../api/quotationsApi';
import { useAuthStore } from '../../../auth/store';
import { formatCurrency } from '../../../../core/utils';
import QuotationComparisonView from './QuotationComparisonView';
import CreatePurchaseQuotationModal from './CreatePurchaseQuotationModal';
import type { QuotationStatus } from '../../../sales/types/quotation';

interface QuotationItemDetail {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  size: string | null;
  part_number: string | null;
  sku: string | null;
}

interface QuotationListRow {
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

interface Props {
  onConvertToPurchase?: () => void;
}

interface QuotationGroup {
  groupId: string;
  quotations: QuotationListRow[];
}

const STATUS_CONFIG: Record<
  QuotationStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  draft: {
    label: 'مسودة',
    color: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300',
    icon: <Clock size={12} />,
  },
  sent: {
    label: 'مُرسل',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    icon: <Send size={12} />,
  },
  pending: {
    label: 'قيد المراجعة',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: <Clock size={12} />,
  },
  submitted: {
    label: 'مُقدم من المورد',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: <Send size={12} />,
  },
  accepted: {
    label: 'مقبول',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    icon: <CheckCircle size={12} />,
  },
  rejected: {
    label: 'مرفوض',
    color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
    icon: <XCircle size={12} />,
  },
  expired: {
    label: 'منتهي',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    icon: <Clock size={12} />,
  },
  converted: {
    label: 'تم التحويل',
    color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    icon: <ArrowRightLeft size={12} />,
  },
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

const stringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const numberValue = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const relationName = (value: unknown): string => {
  const record = asRecord(value);
  if (record !== null) return stringValue(record.name, 'مورد غير محدد');
  if (Array.isArray(value)) return relationName(value[0]);
  return 'مورد غير محدد';
};

const normalizeItemDetail = (value: unknown): QuotationItemDetail | null => {
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

const normalizeQuotation = (value: unknown): QuotationListRow | null => {
  const row = asRecord(value);
  if (row === null) return null;
  const id = stringValue(row.id);
  const status = stringValue(row.status, 'draft');
  if (id === '' || !(status in STATUS_CONFIG)) return null;
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

const normalizeQuotations = (value: unknown): QuotationListRow[] =>
  Array.isArray(value)
    ? value.map(normalizeQuotation).filter((row): row is QuotationListRow => row !== null)
    : [];

const groupQuotations = (quotations: QuotationListRow[]): QuotationGroup[] => {
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

const matchesSearch = (group: QuotationGroup, term: string): boolean =>
  group.quotations.some(
    quotation =>
      quotation.quotation_number.toLowerCase().includes(term) ||
      quotation.supplier_name.toLowerCase().includes(term) ||
      quotation.items.some(
        item =>
          item.description.toLowerCase().includes(term) ||
          (item.part_number !== null && item.part_number.toLowerCase().includes(term)) ||
          (item.size !== null && item.size.toLowerCase().includes(term))
      )
  );

const QuotationItemsTable = ({
  items,
  currencyCode,
}: {
  items: QuotationItemDetail[];
  currencyCode: string;
}): React.ReactElement => (
  <div className="overflow-x-auto rounded-xl border border-gray-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800/80">
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-gray-100 bg-gray-50 text-gray-600 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300">
          <th className="w-8 px-3 py-2.5 text-right font-bold">#</th>
          <th className="px-3 py-2.5 text-right font-bold">الصنف / البند</th>
          <th className="min-w-[90px] bg-violet-50/60 px-3 py-2.5 text-center font-bold text-violet-700 dark:bg-violet-950/30 dark:text-violet-400">
            القياس
          </th>
          <th className="w-16 px-3 py-2.5 text-center font-bold">الكمية</th>
          <th className="min-w-[100px] bg-emerald-50/60 px-3 py-2.5 text-center font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            سعر الوحدة
          </th>
          <th className="min-w-[110px] px-3 py-2.5 text-center font-bold">إجمالي السعر</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
        {items.map((item, index) => (
          <tr
            key={item.id !== '' ? item.id : String(index)}
            className="transition-colors hover:bg-gray-50/70 dark:hover:bg-slate-700/30"
          >
            <td className="px-3 py-2.5 font-mono text-gray-400">{index + 1}</td>
            <td className="px-3 py-2.5">
              <div className="font-medium text-gray-800 dark:text-gray-200">{item.description}</div>
              {item.part_number !== null && (
                <span className="font-mono text-[10px] text-gray-400">
                  رقم القطعة: {item.part_number}
                </span>
              )}
            </td>
            <td className="bg-violet-50/30 px-3 py-2.5 text-center dark:bg-violet-950/10">
              {item.size !== null ? (
                <span className="inline-flex items-center rounded bg-violet-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                  {item.size}
                </span>
              ) : (
                <span className="text-gray-300 dark:text-slate-600">—</span>
              )}
            </td>
            <td className="px-3 py-2.5 text-center font-mono font-medium text-gray-700 dark:text-gray-300">
              {item.quantity}
            </td>
            <td
              className="bg-emerald-50/30 px-3 py-2.5 text-center font-mono font-bold text-emerald-600 dark:bg-emerald-950/10 dark:text-emerald-400"
              dir="ltr"
            >
              {formatCurrency(item.unit_price, currencyCode)}
            </td>
            <td
              className="px-3 py-2.5 text-center font-mono font-bold text-gray-900 dark:text-white"
              dir="ltr"
            >
              {formatCurrency(
                item.total > 0 ? item.total : item.unit_price * item.quantity,
                currencyCode
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const QuotationRow = ({
  quotation,
  isExpanded,
  onToggleExpand,
}: {
  quotation: QuotationListRow;
  isExpanded: boolean;
  onToggleExpand: () => void;
}): React.ReactElement => {
  const status = STATUS_CONFIG[quotation.status];
  return (
    <div className="transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
      <div
        onClick={onToggleExpand}
        className="flex cursor-pointer items-center justify-between p-3"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label={isExpanded ? 'طي تفاصيل العرض' : 'عرض بنود العرض والقياس والأسعار'}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-700 dark:hover:text-gray-200"
          >
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <span className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
            {quotation.quotation_number}
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {quotation.supplier_name}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}
          >
            {status.icon} {status.label}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-sm font-bold text-gray-900 dark:text-white" dir="ltr">
            {formatCurrency(quotation.total_amount, quotation.currency_code)}
          </span>
          <span className="text-xs font-medium text-gray-400">{quotation.item_count} بنود</span>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
          {quotation.items.length === 0 ? (
            <p className="py-2 text-center text-xs text-gray-400">لا توجد تفاصيل لبنود هذا العرض</p>
          ) : (
            <QuotationItemsTable items={quotation.items} currencyCode={quotation.currency_code} />
          )}
        </div>
      )}
    </div>
  );
};

const QuotationGroupCard = ({
  group,
  compareGroupId,
  expandedQuotationId,
  onToggleQuotation,
  onCompare,
}: {
  group: QuotationGroup;
  compareGroupId: string | null;
  expandedQuotationId: string | null;
  onToggleQuotation: (id: string) => void;
  onCompare: (groupId: string) => void;
}): React.ReactElement => (
  <div className="overflow-hidden rounded-2xl border border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
    <div className="flex flex-col justify-between gap-3 border-b border-gray-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">طلب عرض سعر</h3>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
            {group.quotations.length} عرض
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-gray-400">
          {group.groupId.substring(0, 8)}...
        </p>
      </div>
      {group.quotations.length >= 2 && (
        <button
          onClick={() => {
            onCompare(group.groupId);
          }}
          className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-100 dark:bg-violet-900/20 dark:text-violet-400 dark:hover:bg-violet-900/40"
        >
          <Scale size={14} />
          {compareGroupId === group.groupId ? 'إخفاء المقارنة' : 'مقارنة العروض'}
        </button>
      )}
    </div>
    <div className="divide-y divide-gray-50 dark:divide-slate-800">
      {group.quotations.map(quotation => (
        <QuotationRow
          key={quotation.id}
          quotation={quotation}
          isExpanded={expandedQuotationId === quotation.id}
          onToggleExpand={() => {
            onToggleQuotation(quotation.id);
          }}
        />
      ))}
    </div>
  </div>
);

const DetailedQuotationsTable = ({
  quotations,
}: {
  quotations: QuotationListRow[];
}): React.ReactElement => {
  const flatItems = useMemo(
    () =>
      quotations.flatMap(quotation =>
        quotation.items.map((item, idx) => ({
          ...item,
          uniqueKey: `${quotation.id}-${item.id !== '' ? item.id : String(idx)}`,
          quotationId: quotation.id,
          quotationNumber: quotation.quotation_number,
          supplierName: quotation.supplier_name,
          status: quotation.status,
          currencyCode: quotation.currency_code,
          createdAt: quotation.created_at,
          rfqGroupId: quotation.rfq_group_id,
        }))
      ),
    [quotations]
  );

  if (flatItems.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
        <p className="font-medium text-gray-500 dark:text-gray-400">
          لا توجد بنود عروض أسعار للعرض
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200/80 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
      <div className="scroll-x-hint-surface overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-gray-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-gray-300">
              <th className="w-10 px-3 py-3 text-right text-xs font-bold">#</th>
              <th className="min-w-[110px] px-3 py-3 text-right text-xs font-bold">رقم العرض</th>
              <th className="min-w-[130px] px-3 py-3 text-right text-xs font-bold">المورد</th>
              <th className="min-w-[180px] px-4 py-3 text-right text-xs font-bold">
                الصنف / البند
              </th>
              <th className="min-w-[95px] bg-violet-50/60 px-3 py-3 text-center text-xs font-bold text-violet-700 dark:bg-violet-950/30 dark:text-violet-400">
                القياس
              </th>
              <th className="w-16 px-3 py-3 text-center text-xs font-bold">الكمية</th>
              <th className="min-w-[120px] bg-emerald-50/60 px-3 py-3 text-center text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                سعر الوحدة
              </th>
              <th className="min-w-[120px] px-3 py-3 text-center text-xs font-bold">
                إجمالي السعر
              </th>
              <th className="min-w-[90px] px-3 py-3 text-center text-xs font-bold">الحالة</th>
              <th className="min-w-[90px] px-3 py-3 text-center text-xs font-bold">التاريخ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {flatItems.map((item, index) => {
              const status = STATUS_CONFIG[item.status];
              return (
                <tr
                  key={item.uniqueKey}
                  className="transition-colors hover:bg-gray-50/60 dark:hover:bg-slate-800/40"
                >
                  <td className="px-3 py-3 font-mono text-xs text-gray-400">{index + 1}</td>
                  <td className="px-3 py-3 font-mono text-xs font-bold text-violet-600 dark:text-violet-400">
                    {item.quotationNumber}
                  </td>
                  <td className="px-3 py-3 text-xs font-semibold text-gray-800 dark:text-gray-200">
                    {item.supplierName}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-xs font-medium text-gray-900 dark:text-white">
                      {item.description}
                    </div>
                    {item.part_number !== null && (
                      <span className="font-mono text-[10px] text-gray-400">
                        رقم القطعة: {item.part_number}
                      </span>
                    )}
                  </td>
                  <td className="bg-violet-50/20 px-3 py-3 text-center dark:bg-violet-950/10">
                    {item.size !== null ? (
                      <span className="inline-flex items-center rounded bg-violet-100 px-2 py-0.5 font-mono text-xs font-semibold text-violet-800 dark:bg-violet-900/40 dark:text-violet-300">
                        {item.size}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center font-mono text-xs font-medium text-gray-700 dark:text-gray-300">
                    {item.quantity}
                  </td>
                  <td
                    className="bg-emerald-50/20 px-3 py-3 text-center font-mono text-xs font-bold text-emerald-600 dark:bg-emerald-950/10 dark:text-emerald-400"
                    dir="ltr"
                  >
                    {formatCurrency(item.unit_price, item.currencyCode)}
                  </td>
                  <td
                    className="px-3 py-3 text-center font-mono text-xs font-bold text-gray-900 dark:text-white"
                    dir="ltr"
                  >
                    {formatCurrency(
                      item.total > 0 ? item.total : item.unit_price * item.quantity,
                      item.currencyCode
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}
                    >
                      {status.icon} {status.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center font-mono text-xs text-gray-400">
                    {item.createdAt !== '' ? item.createdAt.split('T')[0] : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const PurchaseQuotationsTab: React.FC<Props> = ({ onConvertToPurchase }) => {
  const { user } = useAuthStore();
  const [quotations, setQuotations] = useState<QuotationListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [compareGroupId, setCompareGroupId] = useState<string | null>(null);
  const [expandedQuotationId, setExpandedQuotationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('table');

  const fetchQuotations = useCallback(async (): Promise<void> => {
    if (user?.company_id === undefined) return;
    setLoading(true);
    const response = await purchaseQuotationsApi.getQuotations(user.company_id);
    const rawData: unknown = response.data;
    setQuotations(normalizeQuotations(rawData));
    setLoading(false);
  }, [user?.company_id]);

  useEffect(() => {
    void fetchQuotations();
  }, [fetchQuotations]);

  const grouped = useMemo(() => groupQuotations(quotations), [quotations]);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filtered = useMemo(
    () =>
      normalizedSearch === ''
        ? grouped
        : grouped.filter(group => matchesSearch(group, normalizedSearch)),
    [grouped, normalizedSearch]
  );

  const filteredFlatQuotations = useMemo(
    () =>
      normalizedSearch === ''
        ? quotations
        : quotations.filter(
            quotation =>
              quotation.quotation_number.toLowerCase().includes(normalizedSearch) ||
              quotation.supplier_name.toLowerCase().includes(normalizedSearch) ||
              quotation.items.some(
                item =>
                  item.description.toLowerCase().includes(normalizedSearch) ||
                  (item.part_number !== null &&
                    item.part_number.toLowerCase().includes(normalizedSearch)) ||
                  (item.size !== null && item.size.toLowerCase().includes(normalizedSearch))
              )
          ),
    [quotations, normalizedSearch]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-2.5 dark:bg-violet-900/30">
            <FileText size={20} className="text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">عروض أسعار الموردين</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {quotations.length} عرض • {grouped.length} طلب
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode switcher */}
          <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => {
                setViewMode('table');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <TableIcon size={14} />
              جدول العروض
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('grouped');
              }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'grouped'
                  ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-700 dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <LayoutGrid size={14} />
              مجموعات الطلب
            </button>
          </div>

          <button
            onClick={() => {
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-violet-600/20 transition-colors hover:bg-violet-700"
          >
            <Plus size={16} />
            تسجيل عرض مورد
          </button>
        </div>
      </div>

      <div className="relative max-w-xs">
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={event => {
            setSearchTerm(event.target.value);
          }}
          placeholder="بحث بالرقم أو المورد أو الصنف أو القياس..."
          className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 dark:border-slate-700 dark:bg-slate-800"
        />
      </div>

      {compareGroupId !== null && (
        <QuotationComparisonView
          rfqGroupId={compareGroupId}
          onClose={() => {
            setCompareGroupId(null);
          }}
          {...(onConvertToPurchase !== undefined ? { onConvertToPurchase } : {})}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
          <FileText size={40} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
          <p className="font-medium text-gray-500 dark:text-gray-400">
            لا توجد عروض أسعار من الموردين
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
            سجّل عروض الموردين للمقارنة بينها
          </p>
        </div>
      ) : viewMode === 'table' ? (
        <DetailedQuotationsTable quotations={filteredFlatQuotations} />
      ) : (
        <div className="space-y-3">
          {filtered.map(group => (
            <QuotationGroupCard
              key={group.groupId}
              group={group}
              compareGroupId={compareGroupId}
              expandedQuotationId={expandedQuotationId}
              onToggleQuotation={id => {
                setExpandedQuotationId(current => (current === id ? null : id));
              }}
              onCompare={groupId => {
                setCompareGroupId(compareGroupId === groupId ? null : groupId);
              }}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreatePurchaseQuotationModal
          onClose={() => {
            setShowCreateModal(false);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            void fetchQuotations();
          }}
        />
      )}
    </div>
  );
};

export default PurchaseQuotationsTab;
