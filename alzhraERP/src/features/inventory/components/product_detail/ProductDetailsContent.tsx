import { useState, useMemo } from 'react';
import {
  Box,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  ShieldCheck,
  Info,
  FileClock,
  Link2,
  Sparkles,
  Loader2,
  Building2,
  Activity,
} from 'lucide-react';
import type { Product, warehouseStock } from '../../types';
import { formatCurrency, formatNumberDisplay, cn } from '../../../../core/utils';
import StatCard from './StatCard';
import AlternativesSection from './AlternativesSection';
import HistorySection from './HistorySection';
import BranchStockBreakdown, { type BranchInfo } from './BranchStockBreakdown';
import SupplierInfoCard from './SupplierInfoCard';
import ProductAnalyticsChart from './ProductAnalyticsChart';
import { ProductKitList } from '../auto_parts/ProductKitList';
import { SupplierPricesList } from '../auto_parts/SupplierPricesList';
import { CrossReferenceList } from '../auto_parts/CrossReferenceList';
import { useProductDetails } from '../../hooks/useProductDetails';
import { useAIPartLookup } from '../../hooks/useAIPartLookup';
import { useProductMutations } from '../../hooks/useProducts';
import { useBranches } from '../../../settings/hooks';

interface Props {
  product: Product;
}

type TabType = 'overview' | 'inventory' | 'relations' | 'history';

interface BranchData {
  id: string;
  name: string;
  warehouses?: WarehouseRef[];
}

interface WarehouseRef {
  id: string;
  name: string;
}

interface WarehouseDist {
  warehouse_id?: string;
  warehouse_name?: string;
  quantity?: number;
  location?: string | null;
}

const ProductDetailsContent: React.FC<Props> = ({ product }) => {
  const { stats, margin, supplierName, selling } = useProductDetails(product);
  const { saveProduct } = useProductMutations();
  const [currentAlternatives, setCurrentAlternatives] = useState<string | null>(
    product.alternative_numbers ?? null
  );
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const {
    search: aiImageSearch,
    searchResult: aiResult,
    isSearching: isAISearching,
  } = useAIPartLookup(product.part_number);

  const handleAlternativesUpdate = async (newAlts: string) => {
    setCurrentAlternatives(newAlts);
    await saveProduct({
      id: product.id,
      data: {
        name: product.name,
        alternative_numbers: newAlts,
      },
    });
  };

  // Use the canonical `useBranches` hook to avoid a React Query cache-key collision
  // (['branches', company_id]) that previously caused `branches` to become a raw
  // Supabase `{ data, error }` object instead of an array, breaking `.filter()`.
  const { data: branches = [] } = useBranches();

  const branchStockData = useMemo(() => {
    if (!branches.length || !product.warehouse_distribution?.length) return [];

    const whDistribution = Array.isArray(product.warehouse_distribution)
      ? (product.warehouse_distribution as WarehouseDist[])
      : [];

    return branches.map((branch: BranchData) => ({
      id: branch.id,
      name: branch.name,
      warehouses: whDistribution
        .filter((wh: WarehouseDist) => {
          const branchWarehouses = Array.isArray(branch.warehouses) ? branch.warehouses : [];
          return (
            wh.warehouse_id &&
            branchWarehouses.some((bw: WarehouseRef) => bw.id === wh.warehouse_id)
          );
        })
        .map((wh: WarehouseDist) => ({
          id: wh.warehouse_id,
          name: wh.warehouse_name,
          quantity: wh.quantity,
          location: wh.location || null,
        })),
    }));
  }, [branches, product.warehouse_distribution]);

  const tabs: Array<{
    id: TabType;
    label: string;
    icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  }> = [
    { id: 'overview', label: 'نظرة عامة', icon: Info },
    { id: 'inventory', label: 'المخزون', icon: Box },
    { id: 'relations', label: 'الارتباطات', icon: Link2 },
    { id: 'history', label: 'السجل', icon: FileClock },
  ];

  return (
    <div className="flex h-full flex-col bg-white dark:bg-slate-950">
      {/* Flat Excel Tabs */}
      <div className="sticky top-0 z-30 border-b border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
        <div className="no-scrollbar flex items-center overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={cn(
                'flex shrink-0 items-center gap-2 border-l border-slate-200 px-4 py-2 text-[11px] font-bold uppercase tracking-tight transition-colors dark:border-slate-800',
                activeTab === tab.id
                  ? '-mb-[1px] border-b-2 border-b-blue-600 bg-white text-blue-600 dark:bg-slate-950'
                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/50'
              )}
            >
              <tab.icon size={13} strokeWidth={2.5} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-0">
        <div className="animate-in fade-in h-full duration-200">
          <div className="mx-auto flex h-full max-w-7xl flex-col">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 border-b border-slate-200 dark:border-slate-800 md:grid-cols-12">
                {/* Product Image Cell */}
                <div className="border-l border-slate-200 bg-slate-50/20 p-4 dark:border-slate-800 md:col-span-3">
                  <div className="group relative flex aspect-square items-center justify-center overflow-hidden rounded border border-slate-200 bg-[var(--app-surface)] dark:border-slate-800">
                    {product.image_url || aiResult?.image_url ? (
                      <img
                        src={product.image_url || aiResult?.image_url || ''}
                        alt={product.name}
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <Package
                        size={32}
                        className="text-slate-200 dark:text-slate-800"
                        strokeWidth={1}
                      />
                    )}
                    {/* AI Image Search Overlay */}
                    {product.part_number && (
                      <button
                        onClick={() =>
                          aiImageSearch({
                            partNumber: product.part_number || '',
                            brand: product.brand,
                          })
                        }
                        disabled={isAISearching}
                        className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 rounded border border-slate-200 bg-white/90 py-1 text-[10px] font-bold text-indigo-600 opacity-0 transition-opacity hover:bg-indigo-50 group-hover:opacity-100 dark:border-slate-700 dark:bg-slate-900/90 max-md:opacity-100"
                      >
                        {isAISearching ? (
                          <Loader2 size={9} className="animate-spin" />
                        ) : (
                          <Sparkles size={9} />
                        )}
                        {isAISearching ? 'جاري البحث...' : 'بحث ذكي عن صورة'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Info Columns */}
                <div className="flex flex-col md:col-span-9">
                  {/* Stats Row (Excel Cells) */}
                  <div className="grid grid-cols-3 divide-x divide-x-reverse divide-slate-200 border-b border-slate-200 dark:divide-slate-800 dark:border-slate-800 md:grid-cols-6">
                    <StatCard
                      icon={DollarSign}
                      label="سعر التكلفة"
                      value={formatCurrency(product.cost_price)}
                      color="indigo"
                    />
                    <StatCard
                      icon={TrendingUp}
                      label="سعر البيع"
                      value={formatCurrency(selling)}
                      color="blue"
                    />
                    <StatCard
                      icon={Activity}
                      label="هامش الربح"
                      value={`${margin.toFixed(1)}%`}
                      color={margin > 0 ? 'emerald' : 'rose'}
                    />
                    <StatCard
                      icon={Package}
                      label="المشتريات"
                      value={formatNumberDisplay(stats.total_purchases)}
                      color="slate"
                    />
                    <StatCard
                      icon={TrendingDown}
                      label="المبيعات"
                      value={formatNumberDisplay(stats.total_sales)}
                      color="slate"
                    />
                    <StatCard
                      icon={ShieldCheck}
                      label="متوفر"
                      value={formatNumberDisplay(product.stock_quantity)}
                      color="slate"
                    />
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 divide-x divide-x-reverse divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950 md:grid-cols-2 lg:grid-cols-3">
                    {[
                      { label: 'الشركة الصانعة', value: product.brand || '—' },
                      { label: 'المورد الأساسي', value: supplierName },
                      { label: 'تصنيف الصنف', value: product.category || 'عام' },
                      { label: 'المقاس الحالي', value: product.size || '—' },
                      { label: 'موقع التخزين', value: product.location || '—' },
                      {
                        label: 'حالة المخزون',
                        value:
                          product.stock_quantity > product.min_stock_level
                            ? 'وافر'
                            : product.stock_quantity > 0
                              ? 'منخفض'
                              : 'منتهي',
                        isStatus: true,
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col gap-1 border-b border-slate-200 p-3 dark:border-slate-800"
                      >
                        <span className="text-[10px] font-bold uppercase tracking-tighter text-slate-500">
                          {item.label}
                        </span>
                        <span
                          className={cn(
                            'truncate text-sm font-bold',
                            item.isStatus
                              ? item.value === 'وافر'
                                ? 'text-emerald-600'
                                : 'text-rose-600'
                              : 'text-slate-900 dark:text-slate-100'
                          )}
                        >
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Analytics & Supplier Row */}
                  <div className="grid grid-cols-1 gap-3 border-t border-slate-200 bg-slate-50/20 p-3 dark:border-slate-800 dark:bg-slate-900/20 md:grid-cols-2">
                    <ProductAnalyticsChart
                      data={{
                        totalSales: Number(stats.total_sales) || 0,
                        totalPurchases: Number(stats.total_purchases) || 0,
                        profit: Number(stats.profit) || 0,
                        margin: margin,
                      }}
                    />
                    <SupplierInfoCard supplierName={supplierName} isLoading={false} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="border-b border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <div className="mb-4 flex items-center gap-2">
                  <Building2 size={16} className="text-indigo-500" />
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    توزيع المخزون حسب الفروع والمستودعات
                  </h4>
                </div>
                <BranchStockBreakdown
                  warehouseDistribution={
                    (product.warehouse_distribution || []) as unknown as warehouseStock[]
                  }
                  branches={branchStockData as unknown as BranchInfo[]}
                  totalStock={product.stock_quantity}
                  minStockLevel={product.min_stock_level}
                />
              </div>
            )}

            {activeTab === 'relations' && (
              <div className="flex-1 divide-y divide-slate-200 border-b border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                <div className="grid h-1/2 grid-cols-1 divide-x divide-x-reverse divide-slate-200 border-b border-slate-200 dark:divide-slate-800 dark:border-slate-800 md:grid-cols-2">
                  <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-slate-950">
                    <AlternativesSection
                      alternatives={currentAlternatives ?? product.alternative_numbers}
                      partNumber={product.part_number}
                      brand={product.brand}
                      productId={product.id}
                      onAlternativesUpdate={handleAlternativesUpdate}
                    />
                  </div>
                  <div className="flex h-full flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                    <ProductKitList product={product} />
                  </div>
                </div>
                <div className="grid h-1/2 grid-cols-1 divide-x divide-x-reverse divide-slate-200 dark:divide-slate-800 md:grid-cols-2">
                  <div className="flex h-full flex-col overflow-hidden bg-white dark:bg-slate-950">
                    <SupplierPricesList product={product} />
                  </div>
                  <div className="flex h-full flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                    <CrossReferenceList product={product} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="flex min-h-0 flex-1 flex-col border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
                  <h4 className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500">
                    <FileClock size={12} className="text-rose-500" /> سجل حركات الصنف
                  </h4>
                </div>
                <div className="custom-scrollbar flex-1 overflow-y-auto p-0">
                  <HistorySection productId={product.id} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsContent;
