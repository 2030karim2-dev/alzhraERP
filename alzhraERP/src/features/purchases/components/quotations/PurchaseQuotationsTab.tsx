import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, CheckCircle, Clock, FileText, Loader2, Plus, Scale, Search, Send, XCircle } from 'lucide-react';
import { purchaseQuotationsApi } from '../../api/quotationsApi';
import { useAuthStore } from '../../../auth/store';
import { formatCurrency } from '../../../../core/utils';
import QuotationComparisonView from './QuotationComparisonView';
import CreatePurchaseQuotationModal from './CreatePurchaseQuotationModal';
import type { QuotationStatus } from '../../../sales/types/quotation';

interface QuotationListRow {
  id: string;
  quotation_number: string;
  status: QuotationStatus;
  total_amount: number;
  currency_code: string;
  rfq_group_id: string | null;
  created_at: string;
  supplier_name: string;
  item_count: number;
}
interface Props { onConvertToPurchase?: () => void; }
interface QuotationGroup { groupId: string; quotations: QuotationListRow[]; }
const STATUS_CONFIG: Record<QuotationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300', icon: <Clock size={12} /> },
  sent: { label: 'مُرسل', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Send size={12} /> },
  accepted: { label: 'مقبول', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: <CheckCircle size={12} /> },
  rejected: { label: 'مرفوض', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', icon: <XCircle size={12} /> },
  expired: { label: 'منتهي', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: <Clock size={12} /> },
  converted: { label: 'تم التحويل', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: <ArrowRightLeft size={12} /> },
};
const asRecord = (value: unknown): Record<string, unknown> | null => typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
const stringValue = (value: unknown, fallback = ''): string => typeof value === 'string' ? value : fallback;
const numberValue = (value: unknown): number => typeof value === 'number' && Number.isFinite(value) ? value : 0;
const relationName = (value: unknown): string => {
  const record = asRecord(value);
  if (record !== null) return stringValue(record.name, 'مورد غير محدد');
  if (Array.isArray(value)) return relationName(value[0]);
  return 'مورد غير محدد';
};
const normalizeQuotation = (value: unknown): QuotationListRow | null => {
  const row = asRecord(value);
  if (row === null) return null;
  const id = stringValue(row.id);
  const status = stringValue(row.status, 'draft');
  if (id === '' || !(status in STATUS_CONFIG)) return null;
  return { id, quotation_number: stringValue(row.quotation_number), status: status as QuotationStatus, total_amount: numberValue(row.total_amount), currency_code: stringValue(row.currency_code, 'SAR'), rfq_group_id: typeof row.rfq_group_id === 'string' ? row.rfq_group_id : null, created_at: stringValue(row.created_at), supplier_name: relationName(row.party), item_count: Array.isArray(row.quotation_items) ? row.quotation_items.length : 0 };
};
const normalizeQuotations = (value: unknown): QuotationListRow[] => Array.isArray(value) ? value.map(normalizeQuotation).filter((row): row is QuotationListRow => row !== null) : [];
const groupQuotations = (quotations: QuotationListRow[]): QuotationGroup[] => {
  const groups = new Map<string, QuotationListRow[]>();
  quotations.forEach(quotation => {
    const groupId = quotation.rfq_group_id ?? quotation.id;
    const group = groups.get(groupId) ?? [];
    group.push(quotation);
    groups.set(groupId, group);
  });
  return [...groups.entries()].map(([groupId, groupedQuotations]) => ({ groupId, quotations: groupedQuotations })).sort((a, b) => new Date(b.quotations[0]?.created_at ?? 0).getTime() - new Date(a.quotations[0]?.created_at ?? 0).getTime());
};
const matchesSearch = (group: QuotationGroup, term: string): boolean => group.quotations.some(quotation => quotation.quotation_number.toLowerCase().includes(term) || quotation.supplier_name.toLowerCase().includes(term));
const QuotationRow = ({ quotation }: { quotation: QuotationListRow }): React.ReactElement => { const status = STATUS_CONFIG[quotation.status]; return <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"><div className="flex items-center gap-3"><span className="font-mono text-xs font-bold text-violet-600 dark:text-violet-400">{quotation.quotation_number}</span><span className="font-medium text-sm text-gray-900 dark:text-white">{quotation.supplier_name}</span><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${status.color}`}>{status.icon} {status.label}</span></div><div className="flex items-center gap-4"><span className="font-mono font-bold text-sm text-gray-900 dark:text-white" dir="ltr">{formatCurrency(quotation.total_amount, quotation.currency_code)}</span><span className="text-xs text-gray-400">{quotation.item_count} بنود</span></div></div>; };
const QuotationGroupCard = ({ group, compareGroupId, onCompare }: { group: QuotationGroup; compareGroupId: string | null; onCompare: (groupId: string) => void }): React.ReactElement => <div className="bg-[var(--app-surface)] rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden"><div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800"><div><div className="flex items-center gap-2"><h3 className="font-bold text-gray-900 dark:text-white text-sm">طلب عرض سعر</h3><span className="px-2 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-full text-[10px] font-bold">{group.quotations.length} عرض</span></div><p className="text-[10px] text-gray-400 mt-0.5 font-mono">{group.groupId.substring(0, 8)}...</p></div>{group.quotations.length >= 2 && <button onClick={() => { onCompare(group.groupId); }} className="flex items-center gap-2 px-3 py-2 bg-violet-50 hover:bg-violet-100 dark:bg-violet-900/20 dark:hover:bg-violet-900/40 text-violet-700 dark:text-violet-400 rounded-xl text-xs font-bold transition-colors"><Scale size={14} />{compareGroupId === group.groupId ? 'إخفاء المقارنة' : 'مقارنة العروض'}</button>}</div><div className="divide-y divide-gray-50 dark:divide-slate-800">{group.quotations.map(quotation => <QuotationRow key={quotation.id} quotation={quotation} />)}</div></div>;

export const PurchaseQuotationsTab: React.FC<Props> = ({ onConvertToPurchase }) => {
  const { user } = useAuthStore();
  const [quotations, setQuotations] = useState<QuotationListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [compareGroupId, setCompareGroupId] = useState<string | null>(null);
  const fetchQuotations = useCallback(async (): Promise<void> => {
    if (user?.company_id === undefined) return;
    setLoading(true);
    const response = await purchaseQuotationsApi.getQuotations(user.company_id);
    const rawData: unknown = response.data;
    setQuotations(normalizeQuotations(rawData));
    setLoading(false);
  }, [user?.company_id]);
  useEffect(() => { void fetchQuotations(); }, [fetchQuotations]);
  const grouped = useMemo(() => groupQuotations(quotations), [quotations]);
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filtered = useMemo(() => normalizedSearch === '' ? grouped : grouped.filter(group => matchesSearch(group, normalizedSearch)), [grouped, normalizedSearch]);
  return <div className="space-y-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="p-2.5 bg-violet-100 dark:bg-violet-900/30 rounded-xl"><FileText size={20} className="text-violet-600 dark:text-violet-400" /></div><div><h2 className="text-lg font-bold text-gray-900 dark:text-white">عروض أسعار الموردين</h2><p className="text-xs text-gray-500 dark:text-gray-400">{quotations.length} عرض • {grouped.length} طلب</p></div></div><button onClick={() => { setShowCreateModal(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm shadow-violet-600/20"><Plus size={16} />تسجيل عرض مورد</button></div><div className="relative max-w-xs"><Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" value={searchTerm} onChange={event => { setSearchTerm(event.target.value); }} placeholder="بحث بالرقم أو اسم المورد..." className="w-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl py-2 pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" /></div>{compareGroupId !== null && <QuotationComparisonView rfqGroupId={compareGroupId} onClose={() => { setCompareGroupId(null); }} {...(onConvertToPurchase !== undefined ? { onConvertToPurchase } : {})} />}{loading ? <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-violet-500" /></div> : filtered.length === 0 ? <div className="text-center py-12 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-slate-700"><FileText size={40} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" /><p className="text-gray-500 dark:text-gray-400 font-medium">لا توجد عروض أسعار من الموردين</p><p className="text-xs text-gray-400 dark:text-gray-500 mt-1">سجّل عروض الموردين للمقارنة بينها</p></div> : <div className="space-y-3">{filtered.map(group => <QuotationGroupCard key={group.groupId} group={group} compareGroupId={compareGroupId} onCompare={groupId => { setCompareGroupId(compareGroupId === groupId ? null : groupId); }} />)}</div>}{showCreateModal && <CreatePurchaseQuotationModal onClose={() => { setShowCreateModal(false); }} onSuccess={() => { setShowCreateModal(false); void fetchQuotations(); }} />}</div>;
};

export default PurchaseQuotationsTab;
