
import React, { useState, useMemo, useCallback } from 'react';
import { ShoppingCart, Plus, RefreshCw, Wallet, History, BarChart3, Sparkles, ShieldCheck, Wrench, FileText } from 'lucide-react';
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
import SmartImportView from '../../smart-import/components/SmartImportView';
import { usePurchaseStore } from '../store';
import { purchaseFixesService } from '../services/maintenance/purchaseFixes';
import { useAuthStore } from '../../auth/store';
import { useFeedbackStore } from '../../feedback/store';
import PurchaseReturnsView from '../components/Returns/PurchaseReturnsView';
import PurchaseQuotationsTab from '../components/quotations/PurchaseQuotationsTab';
import { useAIPrefillStore } from '../../ai/store';

const PurchasesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'returns' | 'analytics' | 'smart_import' | 'quotations'>('list');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRepairing, setIsRepairing] = useState(false);
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { showToast } = useFeedbackStore();

  const { data: allPurchases, isLoading } = usePurchases();

  const { bulkLoadItems, setMetadata, setSupplier, } = usePurchaseStore();

  const TABS = [
    { id: 'list', label: t('purchases_log'), icon: History },
    { id: 'create', label: t('new_invoice'), icon: Plus },
    { id: 'smart_import', label: 'استيراد ذكي (AI)', icon: Sparkles },
    { id: 'returns', label: t('supplier_returns'), icon: RefreshCw },
    { id: 'quotations', label: 'عروض الأسعار', icon: FileText },
    { id: 'analytics', label: t('financial_analytics'), icon: BarChart3 }
  ];

  // AI Prefill: consume pending purchase invoice intent
  const consumePrefill = useAIPrefillStore((s: any) => s.consumePrefill);
  React.useEffect(() => {
    const aiData = consumePrefill(['create_purchase_invoice', 'create_return_purchase']);
    if (aiData && aiData.entities) {
      const entities = aiData.entities;
      if (entities.partyName) {
        setSupplier({ id: `ai_temp_${Date.now()}`, name: entities.partyName });
      }
      if (entities.items && entities.items.length > 0) {
        bulkLoadItems(entities.items.map((item: any) => ({
          id: crypto.randomUUID(),
          productId: '',
          sku: '',
          name: item.productName || 'صنف غير محدد',
          partNumber: item.productCode || '',
          brand: item.manufacturer || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          costPrice: item.unitPrice || 0,
        })));
      }
      if (entities.paymentMethod) {
        setMetadata('invoiceType', entities.paymentMethod === 'credit' ? 'credit' : 'cash');
      }
      setActiveTab('create');
    }
  }, [consumePrefill, bulkLoadItems, setSupplier, setMetadata]);

  /**
   * معالجة البيانات القادمة من نظام الاستيراد الذكي (AI)
   * نستخدم bulkLoadItems لضمان نقل البيانات بشكل كتلي وآمن
   */
  const handleSmartImportConfirm = useCallback((data: { items: any[], supplierName?: string, currency?: string }) => {
    const { items, supplierName, currency } = data;

    // 1. تحميل كافة الأصناف بشكل كتلي (Atomic)
    bulkLoadItems(items);

    // 2. تعيين المورد المكتشف (كجهة افتراضية للمراجعة)
    if (supplierName) {
      setSupplier({ id: 'ai_detected', name: supplierName });
    }

    // 3. تعيين العملة المكتشفة
    if (currency) {
      setMetadata('currency', currency);
    }

    // 4. الانتقال لتبويب الإنشاء للمراجعة والاعتماد النهائي
    setActiveTab('create');
  }, [bulkLoadItems, setSupplier, setMetadata]);

  const handleRepairLedger = async () => {
    if (!user?.company_id || !user?.id) return;
    setIsRepairing(true);
    try {
      const result = await purchaseFixesService.fixMissingCashPayments(user.company_id, user.id);
      showToast(result.message, 'success');
    } catch (err: unknown) {
      const e = err as Error;
      showToast(`❌ خطأ في التصحيح: ${e.message}`, 'error');
    } finally {
      setIsRepairing(false);
    }
  };

  const headerActions = (
    <div className="flex gap-3">
      {/* Remove Duplicates Button */}
      <button
        onClick={async () => {
          if (!window.confirm('هل أنت متأكد من حذف القيود المكررة؟ سيتم الاحتفاظ بأقدم قيد فقط لكل فاتورة.')) return;
          if (!user?.company_id) return;
          setIsRepairing(true);
          try {
            const result = await purchaseFixesService.removeDuplicatePurchaseEntries(user.company_id);
            showToast(result.message, 'success');
          } catch (e: unknown) {
            const err = e as Error;
            showToast(`Error: ${err.message}`, 'error');
          } finally {
            setIsRepairing(false);
          }
        }}
        disabled={isRepairing}
        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors font-bold disabled:opacity-50"
      >
        <Sparkles size={20} className={isRepairing ? 'animate-spin' : ''} />
        <span className="hidden md:inline">حذف التكرار</span>
      </button>

      <button
        onClick={handleRepairLedger}
        disabled={isRepairing}
        className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors font-bold disabled:opacity-50"
      >
        <Wrench size={20} className={isRepairing ? 'animate-spin' : ''} />
        <span className="hidden md:inline">{isRepairing ? 'جاري التصحيح...' : 'تصحيح القيود'}</span>
      </button>
      <button
        onClick={() => setIsAuditOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors font-bold"
      >
        <ShieldCheck size={20} />
        <span className="hidden md:inline">فحص النظام</span>
      </button>
      <button
        onClick={() => setIsPaymentModalOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg active:scale-95 shadow-lg shadow-purple-500/20 text-[10px] font-bold uppercase tracking-widest">
        <Wallet size={14} />
        سند صرف
      </button>
    </div>
  );

  const filteredData = useMemo(() => {
    if (!allPurchases) return [];
    return allPurchases.filter((item: any) => {
      if (activeTab === 'returns' && item.type !== 'return_purchase') return false;
      if (activeTab === 'list' && item.type !== 'purchase') return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (item.invoice_number || '').toLowerCase().includes(term) || (item.party?.name || '').toLowerCase().includes(term);
      }
      return true;
    });
  }, [allPurchases, searchTerm, activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'create':
        return <CreatePurchaseModal onSuccess={() => setActiveTab('list')} />;
      case 'smart_import':
        return <SmartImportView mode="invoice" onConfirm={handleSmartImportConfirm} />;
      case 'list':
        return <PurchasesTable data={filteredData} isLoading={isLoading} onView={setViewInvoiceId} />;
      case 'returns':
        return <PurchaseReturnsView searchTerm={searchTerm} onViewDetails={setViewInvoiceId} />;
      case 'quotations':
        return <PurchaseQuotationsTab onConvertToPurchase={() => setActiveTab('create')} />;
      case 'analytics':
        return <PurchasesAnalytics />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-950 font-cairo">
      <MicroHeader
        title={t('purchasing_and_supply')}
        icon={ShoppingCart}
        iconColor="text-blue-600"
        actions={headerActions}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as any)}
        searchPlaceholder={t('search_by_invoice_or_supplier')}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <div className="flex-1 overflow-y-auto px-2 pt-0 pb-16 custom-scrollbar">
        <div className="space-y-3 pt-2 h-full">
          {activeTab !== 'analytics' && activeTab !== 'create' && activeTab !== 'smart_import' && <PurchaseStats />}
          <div className="animate-in fade-in slide-in-from-bottom-1 h-full">
            {renderContent()}
          </div>
        </div>
      </div>

      <PurchaseDetailsModal
        invoiceId={viewInvoiceId}
        onClose={() => setViewInvoiceId(null)}
      />
      <CreatePaymentModal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} />
      {isAuditOpen && <AuditModal onClose={() => setIsAuditOpen(false)} />}
    </div>
  );
};

export default PurchasesPage;
