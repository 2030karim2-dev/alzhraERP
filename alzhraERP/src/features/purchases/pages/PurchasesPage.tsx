import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, FileText, History, Plus, RefreshCw, ShoppingCart, ShieldCheck, Sparkles, Wallet, Wrench } from 'lucide-react';
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
import { purchaseFixesService } from '../services/maintenance/purchaseFixes';
import { useAuthStore } from '../../auth/store';
import type { AuthUser } from '../../auth/types';
import { useFeedbackStore } from '../../feedback/store';
import PurchaseReturnsView from '../components/Returns/PurchaseReturnsView';
import PurchaseQuotationsTab from '../components/quotations/PurchaseQuotationsTab';
import { useAIPrefillStore } from '../../ai/store';
import type { AIEntityItem } from '../../ai/core/types';

type PurchaseTab = 'create' | 'list' | 'returns' | 'analytics' | 'smart_import' | 'quotations';
type AuthUserState = AuthUser | null;
type CompanyUser = AuthUser & { company_id: string };
const hasCompanyUser = (user: AuthUserState): user is CompanyUser => user?.company_id !== undefined && user.company_id !== '';
type PurchaseRows = React.ComponentProps<typeof PurchasesTable>['data'];

const isPurchaseTab = (value: string): value is PurchaseTab => ['create', 'list', 'returns', 'analytics', 'smart_import', 'quotations'].includes(value);
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : String(error);

const usePurchasePrefill = (setActiveTab: React.Dispatch<React.SetStateAction<PurchaseTab>>): void => {
  const { bulkLoadItems, setMetadata, setSupplier } = usePurchaseStore();
  const consumePrefill = useAIPrefillStore(state => state.consumePrefill);
  useEffect(() => {
    const aiData = consumePrefill(['create_purchase_invoice', 'create_return_purchase']);
    const entities = aiData?.entities;
    if (entities === undefined) return;
    if (entities.partyName !== undefined && entities.partyName !== '') setSupplier({ id: `ai_temp_${String(Date.now())}`, name: entities.partyName });
    if (entities.items !== undefined && entities.items.length > 0) {
      bulkLoadItems(entities.items.map((item: AIEntityItem) => ({
        productId: '', sku: '', name: item.productName ?? 'صنف غير محدد', partNumber: item.productCode ?? '', brand: item.manufacturer ?? '',
        quantity: item.quantity ?? 1, unitPrice: item.unitPrice ?? 0, costPrice: item.unitPrice ?? 0,
      })));
    }
    if (entities.paymentMethod !== undefined) setMetadata('invoiceType', entities.paymentMethod === 'credit' ? 'credit' : 'cash');
    setActiveTab('create');
  }, [bulkLoadItems, consumePrefill, setActiveTab, setMetadata, setSupplier]);
};

interface HeaderActionsProps {
  user: AuthUserState;
  isRepairing: boolean;
  setIsRepairing: React.Dispatch<React.SetStateAction<boolean>>;
  setIsPaymentModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsAuditOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const PurchaseHeaderActions: React.FC<HeaderActionsProps> = ({ user, isRepairing, setIsRepairing, setIsPaymentModalOpen, setIsAuditOpen }) => {
  const { showToast } = useFeedbackStore();
  const repairLedger = async (): Promise<void> => {
    if (!hasCompanyUser(user)) return;
    setIsRepairing(true);
    try {
      const result = await purchaseFixesService.fixMissingCashPayments(user.company_id, user.id);
      showToast(result.message, 'success');
    } catch (error: unknown) {
      showToast(`خطأ في التصحيح: ${errorMessage(error)}`, 'error');
    } finally {
      setIsRepairing(false);
    }
  };
  const removeDuplicates = async (): Promise<void> => {
    if (!hasCompanyUser(user)) return;
    if (!window.confirm('هل أنت متأكد من حذف القيود المكررة؟ سيتم الاحتفاظ بأقدم قيد فقط لكل فاتورة.')) return;
    setIsRepairing(true);
    try {
      const result = await purchaseFixesService.removeDuplicatePurchaseEntries(user.company_id);
      showToast(result.message, 'success');
    } catch (error: unknown) {
      showToast(`خطأ: ${errorMessage(error)}`, 'error');
    } finally {
      setIsRepairing(false);
    }
  };
  return <div className="flex gap-3">
    {user?.role === 'admin' && <button onClick={() => { void removeDuplicates(); }} disabled={isRepairing} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-bold disabled:opacity-50"><Sparkles size={20} className={isRepairing ? 'animate-spin' : ''} /><span className="hidden md:inline">حذف التكرار</span></button>}
    {user?.role === 'admin' && <button onClick={() => { void repairLedger(); }} disabled={isRepairing} className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors font-bold disabled:opacity-50"><Wrench size={20} className={isRepairing ? 'animate-spin' : ''} /><span className="hidden md:inline">{isRepairing ? 'جاري التصحيح...' : 'تصحيح القيود'}</span></button>}
    {user?.role === 'admin' && <button onClick={() => { setIsAuditOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-bold"><ShieldCheck size={20} /><span className="hidden md:inline">فحص النظام</span></button>}
    <button onClick={() => { setIsPaymentModalOpen(true); }} className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg active:scale-95 shadow-lg shadow-purple-500/20 text-[10px] font-bold uppercase tracking-widest"><Wallet size={14} />سند صرف</button>
  </div>;
};

interface PageContentProps { activeTab: PurchaseTab; data: PurchaseRows; isLoading: boolean; searchTerm: string; setViewInvoiceId: React.Dispatch<React.SetStateAction<string | null>>; setActiveTab: React.Dispatch<React.SetStateAction<PurchaseTab>>; handleSmartImportConfirm: (data: { items: ExtractedItem[]; supplierName?: string; currency?: string }) => void; }
const PurchasePageContent: React.FC<PageContentProps> = ({ activeTab, data, isLoading, searchTerm, setViewInvoiceId, setActiveTab, handleSmartImportConfirm }) => {
  switch (activeTab) {
    case 'create': return <CreatePurchaseModal onSuccess={() => { setActiveTab('list'); }} />;
    case 'smart_import': return <SmartImportView mode="invoice" onConfirm={handleSmartImportConfirm} />;
    case 'list': return <PurchasesTable data={data} isLoading={isLoading} onView={setViewInvoiceId} />;
    case 'returns': return <PurchaseReturnsView searchTerm={searchTerm} onViewDetails={setViewInvoiceId} />;
    case 'quotations': return <PurchaseQuotationsTab onConvertToPurchase={() => { setActiveTab('create'); }} />;
    case 'analytics': return <PurchasesAnalytics />;
    default: return null;
  }
};

const PurchasesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PurchaseTab>('list');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRepairing, setIsRepairing] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { data: allPurchases = [], isLoading } = usePurchases();
  const { bulkLoadItems, setMetadata, setSupplier } = usePurchaseStore();
  usePurchasePrefill(setActiveTab);
  const handleSmartImportConfirm = useCallback((data: { items: ExtractedItem[]; supplierName?: string; currency?: string }): void => {
    bulkLoadItems(data.items);
    if (data.supplierName !== undefined && data.supplierName !== '') setSupplier({ id: 'ai_detected', name: data.supplierName });
    if (data.currency !== undefined && data.currency !== '') setMetadata('currency', data.currency);
    setActiveTab('create');
  }, [bulkLoadItems, setActiveTab, setMetadata, setSupplier]);
  const filteredData = useMemo(() => allPurchases.filter(item => {
    if (activeTab === 'returns' && item.type !== 'return_purchase') return false;
    if (activeTab === 'list' && item.type !== 'purchase') return false;
    if (searchTerm === '') return true;
    const term = searchTerm.toLowerCase();
    return (item.invoice_number ?? '').toLowerCase().includes(term) || (item.party?.name ?? '').toLowerCase().includes(term);
  }), [activeTab, allPurchases, searchTerm]);
  const TABS = [{ id: 'list', label: t('purchases_log'), icon: History }, { id: 'create', label: t('new_invoice'), icon: Plus }, { id: 'smart_import', label: 'استيراد ذكي (AI)', icon: Sparkles }, { id: 'returns', label: t('supplier_returns'), icon: RefreshCw }, { id: 'quotations', label: 'عروض الأسعار', icon: FileText }, { id: 'analytics', label: t('financial_analytics'), icon: BarChart3 }];
  return <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 font-cairo">
    <MicroHeader title={t('purchasing_and_supply')} icon={ShoppingCart} iconColor="text-blue-600" actions={<PurchaseHeaderActions user={user} isRepairing={isRepairing} setIsRepairing={setIsRepairing} setIsPaymentModalOpen={setIsPaymentModalOpen} setIsAuditOpen={setIsAuditOpen} />} tabs={TABS} activeTab={activeTab} onTabChange={(id: string): void => { if (isPurchaseTab(id)) setActiveTab(id); }} searchPlaceholder={t('search_by_invoice_or_supplier')} searchValue={searchTerm} onSearchChange={setSearchTerm} />
    <div className="flex-1 overflow-y-auto px-2 pt-0 pb-16 custom-scrollbar"><div className="space-y-3 pt-2 h-full">{activeTab !== 'analytics' && activeTab !== 'create' && activeTab !== 'smart_import' && <PurchaseStats />}<div className="animate-in fade-in slide-in-from-bottom-1 h-full"><PurchasePageContent activeTab={activeTab} data={filteredData} isLoading={isLoading} searchTerm={searchTerm} setViewInvoiceId={setViewInvoiceId} setActiveTab={setActiveTab} handleSmartImportConfirm={handleSmartImportConfirm} /></div></div></div>
    <PurchaseDetailsModal invoiceId={viewInvoiceId} onClose={() => { setViewInvoiceId(null); }} /><CreatePaymentModal isOpen={isPaymentModalOpen} onClose={() => { setIsPaymentModalOpen(false); }} />{isAuditOpen && <AuditModal onClose={() => { setIsAuditOpen(false); }} />}
  </div>;
};

export default PurchasesPage;
