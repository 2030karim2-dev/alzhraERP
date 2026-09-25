/* eslint-disable max-lines-per-function */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { purchaseQuotationsApi } from '../../api/quotationsApi';
import { useAuthStore } from '../../../auth/store';
import QuotationComparisonView from './QuotationComparisonView';
import CreatePurchaseQuotationModal from './create/CreatePurchaseQuotationModal';
import { QuotationGroupCard } from './QuotationGroupCard';
import { DetailedQuotationsTable } from './DetailedQuotationsTable';
import { PurchaseQuotationsHeader } from './PurchaseQuotationsHeader';
import {
  groupQuotations,
  matchesSearch,
  normalizeQuotations,
  type QuotationListRow,
} from './types';

interface Props {
  onConvertToPurchase?: () => void;
}

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
    try {
      const response = await purchaseQuotationsApi.getQuotations(user.company_id);
      const rawData: unknown = response.data;
      setQuotations(normalizeQuotations(rawData));
    } finally {
      setLoading(false);
    }
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
                  Boolean(item.part_number?.toLowerCase().includes(normalizedSearch)) ||
                  Boolean(item.size?.toLowerCase().includes(normalizedSearch))
              )
          ),
    [quotations, normalizedSearch]
  );

  return (
    <div className="space-y-4">
      <PurchaseQuotationsHeader
        totalQuotations={quotations.length}
        totalGroups={grouped.length}
        viewMode={viewMode}
        setViewMode={setViewMode}
        onOpenCreateModal={() => {
          setShowCreateModal(true);
        }}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

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
