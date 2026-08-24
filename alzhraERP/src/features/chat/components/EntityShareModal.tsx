import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Car,
  Receipt,
  ArrowLeftRight,
  Search,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthStore } from '../../auth/store';
import type { EntityCardMetadata } from '../types';
import { formatCurrency } from '../../../core/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSelectEntity: (metadata: EntityCardMetadata, isActionRequest?: boolean) => void;
}

export const EntityShareModal: React.FC<Props> = ({ isOpen, onClose, onSelectEntity }) => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'product' | 'vin' | 'transfer' | 'invoice'>('product');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Transfer specific form state
  const [targetBranchId, setTargetBranchId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [transferQty, setTransferQty] = useState(1);
  const [selectedProductForTransfer, setSelectedProductForTransfer] = useState<any | null>(null);

  const companyId = user?.company_id;

  // Load branches
  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('branches')
      .select('id, name')
      .eq('company_id', companyId)
      .then(({ data }) => {
        if (data) setBranches(data);
      });
  }, [companyId]);

  // Search effect
  useEffect(() => {
    if (!isOpen || !companyId || !search.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'product') {
          const { data } = await supabase
            .from('products')
            .select('id, name, part_number, brand, sale_price, total_stock, stock')
            .eq('company_id', companyId)
            .or(`part_number.ilike.%${search}%,name.ilike.%${search}%`)
            .limit(10);
          setResults(data || []);
        } else if (activeTab === 'vin') {
          const { data } = await supabase
            .from('vin_analyses')
            .select('id, vin, vehicle_id, decoded')
            .eq('company_id', companyId)
            .ilike('vin', `%${search}%`)
            .limit(10);
          setResults(data || []);
        } else if (activeTab === 'invoice') {
          const { data } = await supabase
            .from('invoices')
            .select('id, invoice_number, total, created_at, customer_name, status')
            .eq('company_id', companyId)
            .ilike('invoice_number', `%${search}%`)
            .limit(10);
          setResults(data || []);
        }
      } catch (err) {
        // error ignored
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [search, activeTab, companyId, isOpen]);

  if (!isOpen) return null;

  const handleSelectProduct = (product: any) => {
    const metadata: EntityCardMetadata = {
      entity_type: 'product',
      entity_id: product.id,
      title: product.part_number || product.name,
      subtitle: product.name,
      details: {
        part_number: product.part_number,
        brand: product.brand,
        price: product.sale_price,
        total_stock: product.total_stock ?? product.stock ?? 0,
      },
    };
    onSelectEntity(metadata);
    onClose();
  };

  const handleSelectVin = (vinItem: any) => {
    const decoded = vinItem.decoded || {};
    const metadata: EntityCardMetadata = {
      entity_type: 'vin',
      entity_id: vinItem.id,
      title: vinItem.vin,
      subtitle: `${decoded.make || ''} ${decoded.model || ''} ${decoded.year || ''}`,
      details: {
        vin: vinItem.vin,
        make: decoded.make || 'غير محدد',
        model: decoded.model || '',
        year: decoded.year || '',
        engine: decoded.engine || '',
      },
    };
    onSelectEntity(metadata);
    onClose();
  };

  const handleSelectInvoice = (inv: any) => {
    const metadata: EntityCardMetadata = {
      entity_type: 'invoice',
      entity_id: inv.id,
      title: inv.invoice_number,
      subtitle: `فاتورة بمبلغ ${formatCurrency(inv.total)}`,
      details: {
        invoice_number: inv.invoice_number,
        total: inv.total,
        customer_name: inv.customer_name,
        status: inv.status,
      },
    };
    onSelectEntity(metadata);
    onClose();
  };

  const handleCreateTransferRequest = () => {
    if (!selectedProductForTransfer || !targetBranchId) return;

    const targetBranch = branches.find((b) => b.id === targetBranchId);
    const fromBranchName = user?.branch_name || 'الفرع الحالي';

    const metadata: EntityCardMetadata = {
      entity_type: 'transfer',
      entity_id: selectedProductForTransfer.id,
      title: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
      subtitle: `طلب مناقلة ${selectedProductForTransfer.name}`,
      action_type: 'stock_transfer_approval',
      action_status: 'pending',
      details: {
        transfer_number: `TR-${Math.floor(1000 + Math.random() * 9000)}`,
        item_name: selectedProductForTransfer.name || selectedProductForTransfer.part_number,
        part_number: selectedProductForTransfer.part_number,
        quantity: transferQty,
        from_branch: fromBranchName,
        to_branch: targetBranch?.name || 'الفرع المستهدف',
        to_branch_id: targetBranchId,
      },
    };

    onSelectEntity(metadata, true);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex h-[520px] w-full max-w-lg flex-col rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--app-border)] p-4">
          <h3 className="text-base font-bold text-[var(--app-text)]">مشاركة بطاقة ERP في المحادثة</h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-[var(--app-border)] bg-[var(--app-bg)]/50 p-2 gap-1.5">
          <button
            onClick={() => { setActiveTab('product'); setSearch(''); setResults([]); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === 'product'
                ? 'bg-[var(--app-surface)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
            }`}
          >
            <Package size={14} /> قطعة غيار
          </button>

          <button
            onClick={() => { setActiveTab('transfer'); setSearch(''); setResults([]); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === 'transfer'
                ? 'bg-[var(--app-surface)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
            }`}
          >
            <ArrowLeftRight size={14} /> طلب مناقلة
          </button>

          <button
            onClick={() => { setActiveTab('vin'); setSearch(''); setResults([]); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === 'vin'
                ? 'bg-[var(--app-surface)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
            }`}
          >
            <Car size={14} /> رقم هيكل VIN
          </button>

          <button
            onClick={() => { setActiveTab('invoice'); setSearch(''); setResults([]); }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all ${
              activeTab === 'invoice'
                ? 'bg-[var(--app-surface)] text-[var(--accent)] shadow-sm'
                : 'text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-hover)]'
            }`}
          >
            <Receipt size={14} /> فاتورة
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab !== 'transfer' ? (
            <div className="space-y-3">
              <div className="relative">
                <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--app-text-secondary)]" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'product'
                      ? 'ابحث برقم القطعة أو الاسم...'
                      : activeTab === 'vin'
                      ? 'ابحث برقم الهيكل VIN...'
                      : 'ابحث برقم الفاتورة...'
                  }
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] py-2 pe-3 ps-9 text-sm text-[var(--app-text)] outline-none focus:border-[var(--accent)]"
                  autoFocus
                />
              </div>

              {isLoading && (
                <div className="flex items-center justify-center py-10 text-[var(--app-text-secondary)]">
                  <Loader2 size={24} className="animate-spin" />
                </div>
              )}

              {!isLoading && results.length === 0 && search.trim() !== '' && (
                <div className="py-10 text-center text-xs text-[var(--app-text-secondary)]">
                  لا توجد نتائج مطابقة
                </div>
              )}

              <div className="space-y-2">
                {activeTab === 'product' &&
                  results.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectProduct(item)}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--app-border)] p-3 transition-all hover:border-[var(--accent)] hover:bg-[var(--app-surface-hover)]"
                    >
                      <div>
                        <span className="font-mono text-xs font-bold text-[var(--accent)]">{item.part_number}</span>
                        <p className="text-xs font-medium text-[var(--app-text)]">{item.name}</p>
                      </div>
                      <div className="text-end text-xs">
                        <span className="font-bold text-emerald-600">{formatCurrency(item.sale_price)}</span>
                        <span className="block text-[10px] text-[var(--app-text-secondary)]">
                          المتوفر: {item.total_stock ?? item.stock ?? 0}
                        </span>
                      </div>
                    </div>
                  ))}

                {activeTab === 'vin' &&
                  results.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectVin(item)}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--app-border)] p-3 transition-all hover:border-[var(--accent)] hover:bg-[var(--app-surface-hover)]"
                    >
                      <div>
                        <span className="font-mono text-xs font-bold text-[var(--app-text)]">{item.vin}</span>
                        <p className="text-xs text-[var(--app-text-secondary)]">
                          {item.decoded?.make} {item.decoded?.model} {item.decoded?.year}
                        </p>
                      </div>
                    </div>
                  ))}

                {activeTab === 'invoice' &&
                  results.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectInvoice(item)}
                      className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--app-border)] p-3 transition-all hover:border-[var(--accent)] hover:bg-[var(--app-surface-hover)]"
                    >
                      <div>
                        <span className="font-mono text-xs font-bold text-[var(--app-text)]">{item.invoice_number}</span>
                        <p className="text-xs text-[var(--app-text-secondary)]">{item.customer_name || 'عميل نقدي'}</p>
                      </div>
                      <div className="text-end font-bold text-emerald-600">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ) : (
            /* Transfer Request Form */
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-[var(--app-text-secondary)]">اختر القطعة المطلوب مناقلتها:</label>
                {!selectedProductForTransfer ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="ابحث عن الصنف برقم القطعة..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-xs outline-none focus:border-[var(--accent)]"
                    />
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {results.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => setSelectedProductForTransfer(p)}
                          className="flex cursor-pointer items-center justify-between rounded-lg bg-[var(--app-bg)] p-2 hover:bg-[var(--accent)]/10"
                        >
                          <span className="font-mono font-bold">{p.part_number}</span>
                          <span className="text-[11px] text-[var(--app-text-secondary)]">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5">
                    <div>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-300">
                        {selectedProductForTransfer.part_number}
                      </span>
                      <p className="text-[11px]">{selectedProductForTransfer.name}</p>
                    </div>
                    <button
                      onClick={() => setSelectedProductForTransfer(null)}
                      className="text-xs text-rose-500 hover:underline"
                    >
                      تغيير
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-[var(--app-text-secondary)]">الفرع المستهدف:</label>
                  <select
                    value={targetBranchId}
                    onChange={(e) => setTargetBranchId(e.target.value)}
                    className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-2 text-xs outline-none"
                  >
                    <option value="">-- اختر الفرع --</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-semibold text-[var(--app-text-secondary)]">الكمية المطلوبة:</label>
                  <input
                    type="number"
                    min={1}
                    value={transferQty}
                    onChange={(e) => setTransferQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-2 text-xs outline-none"
                  >
                  </input>
                </div>
              </div>

              <button
                onClick={handleCreateTransferRequest}
                disabled={!selectedProductForTransfer || !targetBranchId}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 font-bold text-white shadow-md transition-all hover:opacity-90 disabled:opacity-40"
              >
                <ArrowLeftRight size={16} /> إرسال طلب المناقلة في المحادثة
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
