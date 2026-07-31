import { useState, useMemo } from 'react';
import { Box, DollarSign, TrendingUp, TrendingDown, Package, ShieldCheck, Activity, Info, Settings2, FileClock, Link2, Sparkles, Loader2, Building2, Warehouse } from 'lucide-react';
import { Product } from '../../types';
import { formatCurrency, formatNumberDisplay, cn } from '../../../../core/utils';
import StatCard from './StatCard';
import FitmentSection from './FitmentSection';
import AlternativesSection from './AlternativesSection';
import HistorySection from './HistorySection';
import BranchStockBreakdown from './BranchStockBreakdown';
import SupplierInfoCard from './SupplierInfoCard';
import ProductAnalyticsChart from './ProductAnalyticsChart';
import { VehicleCompatibilityList } from '../auto_parts/VehicleCompatibilityList';
import { ProductKitList } from '../auto_parts/ProductKitList';
import { SupplierPricesList } from '../auto_parts/SupplierPricesList';
import { CrossReferenceList } from '../auto_parts/CrossReferenceList';
import { useProductDetails } from '../../hooks/useProductDetails';
import { useAIPartLookup } from '../../hooks/useAIPartLookup';
import { useAuthStore } from '../../../auth/store';
import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../../../settings/api';

interface Props {
    product: Product;
}

type TabType = 'overview' | 'inventory' | 'specs' | 'relations' | 'history';

const ProductDetailsContent: React.FC<Props> = ({ product }) => {
    const { stats, margin, supplierName, selling } = useProductDetails(product);
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const { search: aiImageSearch, searchResult: aiResult, isSearching: isAISearching } = useAIPartLookup(product.part_number);
    const { user } = useAuthStore();

    // جلب الفروع لربطها مع المستودعات
    const { data: branches = [] } = useQuery({
        queryKey: ['branches', user?.company_id],
        queryFn: () => user?.company_id ? settingsApi.getBranches(user.company_id) : Promise.resolve({ data: [] }),
        enabled: !!user?.company_id,
        select: (result) => result.data || [],
    });

    // بناء هيكل الفروع مع المستودعات المرتبطة
    const branchStockData = useMemo(() => {
        if (!branches.length || !product.warehouse_distribution?.length) return [];

        return branches.map((branch: any) => ({
            id: branch.id,
            name: branch.name,
            warehouses: (product.warehouse_distribution || [])
                .filter((wh: any) => {
                    // ربط المستودعات بالفروع حسب warehouse_id → warehouse.branch_id
                    return wh.warehouse_id && branch.warehouses?.some?.((bw: any) => bw.id === wh.warehouse_id);
                })
                .map((wh: any) => ({
                    id: wh.warehouse_id,
                    name: wh.warehouse_name,
                    quantity: wh.quantity,
                    location: wh.location || null,
                }))
        }));
    }, [branches, product.warehouse_distribution]);

    const tabs: { id: TabType; label: string; icon: any }[] = [
        { id: 'overview', label: 'نظرة عامة', icon: Info },
        { id: 'inventory', label: 'المخزون', icon: Box },
        { id: 'specs', label: 'المواصفات', icon: Settings2 },
        { id: 'relations', label: 'الارتباطات', icon: Link2 },
        { id: 'history', label: 'السجل', icon: FileClock },
    ];

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950">
            {/* Flat Excel Tabs */}
            <div className="sticky top-0 z-30 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 text-[11px] font-bold border-l border-slate-200 dark:border-slate-800 transition-colors uppercase tracking-tight shrink-0",
                                activeTab === tab.id
                                    ? "bg-white dark:bg-slate-950 text-blue-600 border-b-2 border-b-blue-600 -mb-[1px]"
                                    : "text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/50"
                            )}
                        >
                            <tab.icon size={13} strokeWidth={2.5} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden p-0">
                <div className="animate-in fade-in duration-200 h-full">
                    <div className="max-w-7xl mx-auto h-full flex flex-col">
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-12 border-b border-slate-200 dark:border-slate-800">
                                {/* Product Image Cell */}
                                <div className="md:col-span-3 border-l border-slate-200 dark:border-slate-800 p-4 bg-slate-50/20">
                                    <div className="aspect-square bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded flex items-center justify-center overflow-hidden relative group">
                                        {product.image_url || aiResult?.image_url ? (
                                            <img src={product.image_url || aiResult?.image_url || ''} alt={product.name} className="max-w-full max-h-full object-contain" />
                                        ) : (
                                            <Package size={32} className="text-slate-200 dark:text-slate-800" strokeWidth={1} />
                                        )}
                                        {/* AI Image Search Overlay */}
                                        {product.part_number && (
                                            <button
                                                onClick={() => aiImageSearch({ partNumber: product.part_number || '', brand: product.brand })}
                                                disabled={isAISearching}
                                                className="absolute bottom-2 left-2 right-2 flex items-center justify-center gap-1 text-[8px] font-bold py-1 bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 rounded text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-indigo-50"
                                            >
                                                {isAISearching ? <Loader2 size={9} className="animate-spin" /> : <Sparkles size={9} />}
                                                {isAISearching ? 'جاري البحث...' : '🤖 بحث ذكي عن صورة'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Main Info Columns */}
                                <div className="md:col-span-9 flex flex-col">
                                    {/* Stats Row (Excel Cells) */}
                                    <div className="grid grid-cols-3 md:grid-cols-6 border-b border-slate-200 dark:border-slate-800 divide-x divide-x-reverse divide-slate-200 dark:divide-slate-800">
                                        <StatCard icon={DollarSign} label="سعر التكلفة" value={formatCurrency(product.cost_price)} color="indigo" />
                                        <StatCard icon={TrendingUp} label="سعر البيع" value={formatCurrency(selling)} color="blue" />
                                        <StatCard icon={Activity} label="هامش الربح" value={`${margin.toFixed(1)}%`} color={margin > 0 ? "emerald" : "rose"} />
                                        <StatCard icon={Package} label="المشتريات" value={formatNumberDisplay(stats.total_purchases as any)} color="slate" />
                                        <StatCard icon={TrendingDown} label="المبيعات" value={formatNumberDisplay(stats.total_sales as any)} color="slate" />
                                        <StatCard icon={ShieldCheck} label="متوفر" value={formatNumberDisplay(product.stock_quantity)} color="slate" />
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-x divide-x-reverse divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                                        {[
                                            { label: 'الشركة الصانعة', value: product.brand || '—' },
                                            { label: 'المورد الأساسي', value: supplierName },
                                            { label: 'تصنيف الصنف', value: product.category || 'عام' },
                                            { label: 'المقاس الحالي', value: product.size || '—' },
                                            { label: 'موقع التخزين', value: product.location || '—' },
                                            { label: 'حالة المخزون', value: product.stock_quantity > product.min_stock_level ? 'وافر' : product.stock_quantity > 0 ? 'منخفض' : 'منتهي', isStatus: true },
                                        ].map((item, idx) => (
                                            <div key={idx} className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-1">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{item.label}</span>
                                                <span className={cn(
                                                    "text-sm font-bold truncate",
                                                    item.isStatus ? (item.value === 'وافر' ? 'text-emerald-600' : 'text-rose-600') : 'text-slate-900 dark:text-slate-100'
                                                )}>{item.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Analytics & Supplier Row */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50/20 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-800">
                                        <ProductAnalyticsChart
                                            data={{
                                                totalSales: Number(stats.total_sales) || 0,
                                                totalPurchases: Number(stats.total_purchases) || 0,
                                                profit: Number(stats.profit) || 0,
                                                margin: margin,
                                            }}
                                        />
                                        <SupplierInfoCard
                                            supplierName={supplierName}
                                            isLoading={false}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'inventory' && (
                            <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-4">
                                <div className="flex items-center gap-2 mb-4">
                                    <Building2 size={16} className="text-indigo-500" />
                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        توزيع المخزون حسب الفروع والمستودعات
                                    </h4>
                                </div>
                                <BranchStockBreakdown
                                    warehouseDistribution={(product.warehouse_distribution || []) as any}
                                    branches={branchStockData}
                                    totalStock={product.stock_quantity}
                                    minStockLevel={product.min_stock_level}
                                />
                            </div>
                        )}

                        {activeTab === 'specs' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-x-reverse divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 h-full">
                                <div className="bg-white dark:bg-slate-950 flex flex-col h-full">
                                    <div className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 px-4 py-2 shrink-0">
                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                            <Settings2 size={12} className="text-indigo-500" /> المواصفات التقنية والملاءمة
                                        </h4>
                                    </div>
                                    <div className="flex-1 overflow-hidden p-0">
                                        <FitmentSection productId={product.id} />
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-950 flex flex-col h-full border-r border-slate-200 dark:border-slate-800">
                                    <div className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 px-4 py-2 shrink-0">
                                        <h4 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                            <Activity size={12} className="text-emerald-500" /> المركبات والموديلات المتوافقة
                                        </h4>
                                    </div>
                                    <div className="flex-1 overflow-hidden p-0">
                                        <VehicleCompatibilityList product={product} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'relations' && (
                            <div className="divide-y divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 flex-1">
                                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-x-reverse divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 h-1/2">
                                    <div className="bg-white dark:bg-slate-950 overflow-hidden flex flex-col h-full">
                                        <AlternativesSection
                                            alternatives={product.alternative_numbers}
                                            partNumber={product.part_number}
                                            brand={product.brand}
                                            productId={product.id}
                                        />
                                    </div>
                                    <div className="bg-white dark:bg-slate-950 overflow-hidden border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
                                        <ProductKitList product={product} />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-x-reverse divide-slate-200 dark:divide-slate-800 h-1/2">
                                    <div className="bg-white dark:bg-slate-950 overflow-hidden flex flex-col h-full">
                                        <SupplierPricesList product={product} />
                                    </div>
                                    <div className="bg-white dark:bg-slate-950 overflow-hidden border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
                                        <CrossReferenceList product={product} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="bg-white dark:bg-slate-950 flex-1 flex flex-col min-h-0 border-b border-slate-200 dark:border-slate-800">
                                <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 shrink-0">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                        <FileClock size={12} className="text-rose-500" /> سجل حركات الصنف
                                    </h4>
                                </div>
                                <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
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
