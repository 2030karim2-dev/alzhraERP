import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  FileText,
  History,
  Plus,
  RefreshCw,
  ShoppingCart,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import PurchaseStats from '../components/PurchaseStats';
import PurchasesTable from '../components/PurchasesTable';
import CreatePurchaseModal from '../components/CreatePurchaseModal';
import PurchaseDetailsModal from '../components/PurchaseDetailsModal';
import CreatePaymentModal from '../components/CreatePaymentModal';
import { AuditModal } from '../../accounting/components/AuditModal';
import PurchasesAnalytics from '../components/Analytics/PurchasesAnalytics';
import { usePurchases } from '../hooks';
import MicroHeader from '../../../ui/base/MicroHeader';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import SmartImportView, { type ExtractedItem } from '../../smart-import/components/SmartImportView';
import { usePurchaseStore } from '../store';
import { useAuthStore } from '../../auth/store';
import type { AuthUser } from '../../auth/types';
import PurchaseReturnsView from '../components/Returns/PurchaseReturnsView';
import PurchaseQuotationsTab from '../components/quotations/PurchaseQuotationsTab';
import { useAIPrefillStore } from '../../ai/store';
import type { AIEntityItem } from '../../ai/core/types';

type PurchaseTab = 'create' | 'list' | 'returns' | 'analytics' | 'smart_import' | 'quotations';
type AuthUserState = AuthUser | null;
type PurchaseRows = React.ComponentProps<typeof PurchasesTable>['data'];

const isPurchaseTab = (value: string): value is PurchaseTab =>
  ['create', 'list', 'returns', 'analytics', 'smart_import', 'quotations'].includes(value);

const usePurchasePrefill = (
  setActiveTab: React.Dispatch<React.SetStateAction<PurchaseTab>>
): void => {
  const { bulkLoadItems, setMetadata, setSupplier } = usePurchaseStore();
  const consumePrefill = useAIPrefillStore(state => state.consumePrefill);
  useEffect(() => {
    const aiData = consumePrefill(['create_purchase_invoice', 'create_return_purchase']);
    const entities = aiData?.entities;
    if (entities === undefined) return;
    if (entities.partyName !== undefined && entities.partyName !== '')
      setSupplier({ id: `ai_temp_${String(Date.now())}`, name: entities.partyName });
    if (entities.items !== undefined && entities.items.length > 0) {
      bulkLoadItems(
        entities.items.map((item: AIEntityItem) => ({
          productId: '',
          sku: '',
          name: item.productName ?? 'صنف غير محدد',
          partNumber: item.productCode ?? '',
          brand: item.manufacturer ?? '',
          quantity: item.quantity ?? 1,
          unitPrice: item.unitPrice ?? 0,
          costPrice: item.unitPrice ?? 0,
        }))
      );
    }
    if (entities.paymentMethod !== undefined)
      setMetadata('invoiceType', entities.paymentMethod === 'credit' ? 'credit' : 'cash');
    setActiveTab('create');
  }, [bulkLoadItems, consumePrefill, setActiveTab, setMetadata, setSupplier]);
};

interface HeaderActionsProps {
  user: AuthUserState;
  setIsPaymentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsAuditOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// NOTE: The destructive maintenance actions (delete duplicates / fix ledger)
// previously exposed here have been REMOVED. They performed non-transactional
// direct DB writes from the browser (see docs/frontend-backend-deep-audit).
// Any repair must go through a protected server-side RPC with dry-run + audit.
const PurchaseHeaderActions: React.FC<HeaderActionsProps> = ({
  user,
  setIsPaymentModalOpen,
  setIsAuditOpen,
}) => {
  return (
    <div className="flex gap-3">
      {user?.role === 'admin' && (
        <button
          onClick={() => {
            setIsAuditOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 font-bold text-indigo-600 transition-colors hover:bg-indigo-100"
        >
          <ShieldCheck size={20} />
          <span className="hidden md:inline">فحص النظام</span>
        </button>
      )}
      <button
        onClick={() => {
          setIsPaymentModalOpen(true);
        }}
        className="flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg shadow-purple-500/20 active:scale-95"
      >
        <Wallet size={14} />
        سند صرف
      </button>
    </div>
  );
};

interface PageContentProps {
  activeTab: PurchaseTab;
  data: PurchaseRows;
  isLoading: boolean;
  searchTerm: string;
  setViewInvoiceId: React.Dispatch<React.SetStateAction<string | null>>;
  setActiveTab: React.Dispatch<React.SetStateAction<PurchaseTab>>;
  handleSmartImportConfirm: (data: {
    items: ExtractedItem[];
    supplierName?: string;
    currency?: string;
  }) => void;
}
const PurchasePageContent: React.FC<PageContentProps> = ({
  activeTab,
  data,
  isLoading,
  searchTerm,
  setViewInvoiceId,
  setActiveTab,
  handleSmartImportConfirm,
}) => {
  switch (activeTab) {
    case 'create':
      return (
        <CreatePurchaseModal
          onSuccess={() => {
            setActiveTab('list');
          }}
        />
      );
    case 'smart_import':
      return <SmartImportView mode="invoice" onConfirm={handleSmartImportConfirm} />;
    case 'list':
      return <PurchasesTable data={data} isLoading={isLoading} onView={setViewInvoiceId} />;
    case 'returns':
      return <PurchaseReturnsView searchTerm={searchTerm} onViewDetails={setViewInvoiceId} />;
    case 'quotations':
      return (
        <PurchaseQuotationsTab
          onConvertToPurchase={() => {
            setActiveTab('create');
          }}
        />
      );
    case 'analytics':
      return <PurchasesAnalytics />;
    default:
      return null;
  }
};

const PurchasesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PurchaseTab>('list');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: allPurchases = [], isLoading } = usePurchases();
  const { bulkLoadItems, setMetadata, setSupplier } = usePurchaseStore();
  usePurchasePrefill(setActiveTab);
  const handleSmartImportConfirm = useCallback(
    (data: { items: ExtractedItem[]; supplierName?: string; currency?: string }): void => {
      bulkLoadItems(data.items);
      if (data.supplierName !== undefined && data.supplierName !== '')
        setSupplier({ id: 'ai_detected', name: data.supplierName });
      if (data.currency !== undefined && data.currency !== '')
        setMetadata('currency', data.currency);
      setActiveTab('create');
    },
    [bulkLoadItems, setActiveTab, setMetadata, setSupplier]
  );
  const filteredData = useMemo(
    () =>
      allPurchases.filter(item => {
        if (activeTab === 'returns' && item.type !== 'purchase_return') return false;
        if (activeTab === 'list' && item.type !== 'purchase') return false;
        if (searchTerm === '') return true;
        const term = searchTerm.toLowerCase();
        return (
          (item.invoice_number ?? '').toLowerCase().includes(term) ||
          (item.party?.name ?? '').toLowerCase().includes(term)
        );
      }),
    [activeTab, allPurchases, searchTerm]
  );
  const TABS = [
    { id: 'list', label: t('purchases_log'), icon: History },
    { id: 'create', label: t('new_invoice'), icon: Plus },
    { id: 'smart_import', label: 'استيراد ذكي (AI)', icon: Sparkles },
    { id: 'returns', label: t('supplier_returns'), icon: RefreshCw },
    { id: 'quotations', label: 'عروض الأسعار', icon: FileText },
    { id: 'analytics', label: t('financial_analytics'), icon: BarChart3 },
  ];
  return (
    <div className="font-cairo flex h-full flex-col bg-gray-50 dark:bg-slate-950">
      <MicroHeader
        title={activeTab === 'create' ? 'فاتورة توريد جديدة' : t('purchasing_and_supply')}
        icon={ShoppingCart}
        iconColor="text-blue-600"
        actions={
          activeTab === 'create' ? (
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1 text-xs font-bold text-[var(--app-text)] shadow-xs transition-all hover:bg-[var(--app-surface-hover)] active:scale-95"
            >
              <History size={13} className="text-blue-500" />
              <span>سجل الفواتير</span>
            </button>
          ) : (
            <PurchaseHeaderActions
              user={user}
              setIsPaymentModalOpen={setIsPaymentModalOpen}
              setIsAuditOpen={setIsAuditOpen}
            />
          )
        }
        {...(activeTab !== 'create'
          ? {
              tabs: TABS,
              searchPlaceholder: t('search_by_invoice_or_supplier'),
              searchValue: searchTerm,
              onSearchChange: setSearchTerm,
            }
          : {})}
        activeTab={activeTab}
        onTabChange={(id: string): void => {
          if (isPurchaseTab(id)) setActiveTab(id);
        }}
      />
      <div className="custom-scrollbar flex-1 overflow-y-auto px-2 pb-16 pt-0">
        <div className="h-full space-y-3 pt-2">
          {activeTab !== 'analytics' && activeTab !== 'create' && activeTab !== 'smart_import' && (
            <PurchaseStats />
          )}
          <div className="animate-in fade-in slide-in-from-bottom-1 h-full">
            <PurchasePageContent
              activeTab={activeTab}
              data={filteredData}
              isLoading={isLoading}
              searchTerm={searchTerm}
              setViewInvoiceId={setViewInvoiceId}
              setActiveTab={setActiveTab}
              handleSmartImportConfirm={handleSmartImportConfirm}
            />
          </div>
        </div>
      </div>
      <PurchaseDetailsModal
        invoiceId={viewInvoiceId}
        onClose={() => {
          setViewInvoiceId(null);
        }}
      />
      <CreatePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
        }}
      />
      {isAuditOpen && (
        <AuditModal
          onClose={() => {
            setIsAuditOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default PurchasesPage;
