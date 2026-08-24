import React, { useState, useMemo } from 'react';
import {
  Check,
  Copy,
  FileSpreadsheet,
  Layers,
  Search,
  ShoppingCart,
  Car,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { formatCurrency } from '../../../core/utils';
import type { VendorProductItem } from '../types';

interface Props {
  products: VendorProductItem[];
  currency?: string;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onCreateQuotation: (selectedProducts: VendorProductItem[]) => void;
  onExportExcel: () => void;
  onOpenImport: () => void;
  onInlineUpdate?: <K extends keyof VendorProductItem>(productId: string, field: K, value: VendorProductItem[K]) => void;
  isLoading?: boolean;
}

export const SupplierProductDataGrid: React.FC<Props> = ({
  products,
  currency = 'SAR',
  selectedIds,
  onSelectionChange,
  onCreateQuotation,
  onExportExcel,
  onOpenImport,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch =
        !searchTerm.trim() ||
        product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.oem_number && product.oem_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCat = categoryFilter === 'ALL' || product.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [products, searchTerm, categoryFilter]);

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      onSelectionChange(new Set(filteredProducts.map(p => p.product_id)));
    } else {
      onSelectionChange(new Set());
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onSelectionChange(next);
  };

  const handleCopyOem = (oem: string, id: string) => {
    navigator.clipboard.writeText(oem);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const selectedProductsList = useMemo(() => {
    return products.filter(p => selectedIds.has(p.product_id));
  }, [products, selectedIds]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none overflow-hidden transition-all">
      {/* Top Toolbar */}
      <div className="p-4 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="بحث باسم المنتج، رقم OEM، أو كود الصنف..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'جميع الأقسام' : cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            استيراد Excel
          </button>

          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            تصدير Excel
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-right text-sm border-collapse">
          {/* Sticky Header */}
          <thead className="bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 select-none">
            <tr>
              <th className="p-3.5 w-12 text-center">
                <input
                  type="checkbox"
                  checked={filteredProducts.length > 0 && selectedIds.size === filteredProducts.length}
                  onChange={handleSelectAll}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
              </th>
              <th className="p-3.5 min-w-[260px]">الصنف وبيانات القطعة</th>
              <th className="p-3.5 min-w-[160px]">رقم OEM / المرجع</th>
              <th className="p-3.5 min-w-[130px]">التوافق (Vehicle Fit)</th>
              <th className="p-3.5 min-w-[120px] text-center">حالة المخزون</th>
              <th className="p-3.5 min-w-[130px] text-center">سعر التكلفة</th>
              <th className="p-3.5 min-w-[130px] text-center">مدة التوريد</th>
              <th className="p-3.5 min-w-[110px] text-center">الإجراء</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredProducts.map((product, index) => {
              const isSelected = selectedIds.has(product.product_id);
              const stock = product.stock_quantity;

              return (
                <tr
                  key={product.product_id}
                  className={`group transition-colors ${
                    isSelected
                      ? 'bg-indigo-50/60 dark:bg-indigo-950/20'
                      : index % 2 === 0
                      ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      : 'bg-slate-50/30 dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {/* Checkbox */}
                  <td className="p-3.5 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleRow(product.product_id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                    />
                  </td>

                  {/* Product Info Cell */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700 flex items-center justify-center text-slate-400 overflow-hidden flex-shrink-0">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Layers className="w-5 h-5 opacity-40" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {product.product_name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {product.brand && (
                            <span className="font-medium text-slate-600 dark:text-slate-300">
                              {product.brand}
                            </span>
                          )}
                          <span>•</span>
                          <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {product.sku}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* OEM / Part Number */}
                  <td className="p-3.5">
                    {product.oem_number ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        <span>{product.oem_number}</span>
                        <button
                          onClick={() => handleCopyOem(product.oem_number!, product.product_id)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                          title="نسخ رقم القطعة"
                        >
                          {copiedId === product.product_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>

                  {/* Vehicle Compatibility */}
                  <td className="p-3.5">
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50/80 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 text-xs font-medium w-fit">
                      <Car className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                      <span>متوافق مع الشاحنات والسيارات</span>
                    </div>
                  </td>

                  {/* Stock Level Badge */}
                  <td className="p-3.5 text-center">
                    {stock > 20 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100/80 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        متوفر ({stock})
                      </span>
                    ) : stock > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100/80 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        منخفض ({stock})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        نفد (0)
                      </span>
                    )}
                  </td>

                  {/* Price */}
                  <td className="p-3.5 text-center">
                    <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-100" dir="ltr">
                      {formatCurrency(product.cost_price, currency)}
                    </span>
                  </td>

                  {/* Lead Time */}
                  <td className="p-3.5 text-center">
                    <div className="inline-flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{product.lead_time_days} أيام</span>
                    </div>
                  </td>

                  {/* Action */}
                  <td className="p-3.5 text-center">
                    <button
                      onClick={() => onCreateQuotation([product])}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-600 text-indigo-600 hover:text-white dark:text-indigo-400 rounded-lg text-xs font-bold transition-all shadow-sm"
                    >
                      تسعير
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredProducts.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <AlertCircle className="w-12 h-12 stroke-[1.5] mb-2 opacity-50" />
            <p className="text-base font-semibold text-slate-600 dark:text-slate-300">
              لا توجد منتجات مطابقة للبحث
            </p>
            <p className="text-xs text-slate-400 mt-1">
              جرب تغيير كلمة البحث أو فلتر القسم
            </p>
          </div>
        )}
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 dark:bg-slate-950/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-lg flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 pl-4 border-l border-slate-700">
            <span className="w-6 h-6 rounded-full bg-indigo-600 text-xs font-bold flex items-center justify-center">
              {selectedIds.size}
            </span>
            <span className="text-xs font-medium text-slate-300">صنف محدد</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onCreateQuotation(selectedProductsList)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              إنشاء عرض سعر للمنتجات المحددة
            </button>

            <button
              onClick={() => onSelectionChange(new Set())}
              className="px-3 py-2 text-xs text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              إلغاء التحديد
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
