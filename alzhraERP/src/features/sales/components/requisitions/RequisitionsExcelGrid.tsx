/* eslint-disable max-lines-per-function, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/no-unnecessary-type-conversion, @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unnecessary-condition */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2, Plus, Copy, Sparkles, ArrowUp, ArrowDown, X } from 'lucide-react';
import { useRequisitionsStore } from '../../store/requisitionsStore';
import { useProductSearch, type ProductSearchResult } from '../../hooks/useProductSearch';
import { useCompany } from '@/features/settings/hooks';
import { cn, normalizeArabicDigits, parseNumberFlexible } from '@/core/utils';

interface RequisitionsExcelGridProps {
  searchTerm?: string;
}

export const RequisitionsExcelGrid: React.FC<RequisitionsExcelGridProps> = ({
  searchTerm = '',
}) => {
  const { data: company } = useCompany();
  const companyId = company?.id || '';

  const { items, addItem, updateItem, removeItem, duplicateItem, moveItem } =
    useRequisitionsStore();

  // Autocomplete search state
  const [activeSearchRowId, setActiveSearchRowId] = useState<string | null>(null);
  const [activeSearchField, setActiveSearchField] = useState<'name' | 'partNumber'>('name');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Focus tracking for keyboard navigation
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const { products, isLoading: isSearchLoading } = useProductSearch(searchQuery, {
    companyId,
    enabled: Boolean(companyId && searchQuery.trim().length >= 2 && isDropdownOpen),
  });

  // Handle selecting a catalog product
  const handleSelectProduct = useCallback(
    (rowId: string, product: ProductSearchResult) => {
      updateItem(rowId, {
        productId: product.id,
        name: product.name_ar || '',
        partNumber: product.sku || '',
        brand: product.category || '',
        quantity: 1,
      });
      setIsDropdownOpen(false);
      setActiveSearchRowId(null);
      setSearchQuery('');
    },
    [updateItem]
  );

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (gridContainerRef.current && !gridContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
        setActiveSearchRowId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter items if parent provided a filter search term
  const filteredItems = items.filter(item => {
    if (!searchTerm?.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    return (
      item.name.toLowerCase().includes(q) ||
      item.partNumber.toLowerCase().includes(q) ||
      item.brand.toLowerCase().includes(q) ||
      item.notes?.toLowerCase().includes(q)
    );
  });

  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const nonEmptyCount = items.filter(
    item => item.name.trim() !== '' || item.partNumber.trim() !== ''
  ).length;

  return (
    <div className="flex flex-col gap-2" ref={gridContainerRef}>
      {/* Excel Table Container with Visible Border Lines */}
      <div className="relative overflow-x-auto rounded-lg border-2 border-slate-300 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full min-w-[780px] border-collapse text-right text-xs">
          {/* Excel Header */}
          <thead>
            <tr className="bg-slate-800 text-white dark:bg-slate-950">
              <th className="w-12 border border-slate-600 px-2 py-2.5 text-center font-bold">#</th>
              <th className="border border-slate-600 px-3 py-2.5 font-bold">
                اسم القطعة المطلوبة <span className="text-amber-400">*</span>
              </th>
              <th className="w-56 border border-slate-600 px-3 py-2.5 font-bold">
                رقم القطعة (Part No)
              </th>
              <th className="w-48 border border-slate-600 px-3 py-2.5 font-bold">
                الشركة الصانعة (Brand)
              </th>
              <th className="w-24 border border-slate-600 px-2 py-2.5 text-center font-bold">
                الكمية
              </th>
              <th className="w-60 border border-slate-600 px-3 py-2.5 font-bold">ملاحظات</th>
              <th className="no-print w-28 border border-slate-600 px-2 py-2.5 text-center font-bold">
                إجراءات
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {filteredItems.map((item, index) => {
              const isEven = index % 2 === 0;

              return (
                <tr
                  key={item.id}
                  className={cn(
                    'group transition-colors',
                    isEven ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/80 dark:bg-slate-800/40',
                    'hover:bg-blue-50/70 dark:hover:bg-slate-800/80'
                  )}
                >
                  {/* Row Index # */}
                  <td className="border border-slate-300 bg-slate-100/70 px-1 py-1.5 text-center font-mono text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-400">
                    {index + 1}
                  </td>

                  {/* Part Name Cell with Autocomplete Dropdown */}
                  <td className="relative border border-slate-300 p-0 dark:border-slate-700">
                    <div className="flex h-full w-full items-center">
                      <input
                        type="text"
                        value={item.name}
                        placeholder="اكتب اسم القطعة أو ابحث في المخزن..."
                        onChange={e => {
                          const val = e.target.value;
                          updateItem(item.id, { name: val });
                          setActiveSearchRowId(item.id);
                          setActiveSearchField('name');
                          setSearchQuery(val);
                          setIsDropdownOpen(val.trim().length >= 2);
                        }}
                        onFocus={() => {
                          setActiveSearchRowId(item.id);
                          setActiveSearchField('name');
                          if (item.name.trim().length >= 2) {
                            setSearchQuery(item.name);
                            setIsDropdownOpen(true);
                          }
                        }}
                        className="h-9 w-full bg-transparent px-2.5 py-1 text-xs font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:bg-blue-50/50 focus:text-blue-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-blue-950/30 dark:focus:text-blue-200"
                      />
                      {item.productId && (
                        <span
                          title="تم الربط التلقائي من المخزن (يمكنك تعديل الاسم بحرية دون التأثير على المنتج الأصلي)"
                          className="mx-1.5 flex shrink-0 items-center gap-0.5 rounded bg-emerald-100 px-1 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300"
                        >
                          <Sparkles size={11} />
                          <span>مرتبط</span>
                        </span>
                      )}
                    </div>

                    {/* Autocomplete Popup */}
                    {activeSearchRowId === item.id &&
                      activeSearchField === 'name' &&
                      isDropdownOpen && (
                        <div className="absolute right-0 top-full z-50 mt-1 max-h-56 w-80 overflow-y-auto rounded-lg border border-slate-300 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                          <div className="flex items-center justify-between border-b border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-500 dark:border-slate-800">
                            <span>نتائج من المخزون (اختر لملء الحقول تلقائياً):</span>
                            <button
                              type="button"
                              onClick={() => {
                                setIsDropdownOpen(false);
                              }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <X size={12} />
                            </button>
                          </div>

                          {isSearchLoading ? (
                            <div className="p-3 text-center text-xs text-slate-500">
                              جاري البحث في المخزون...
                            </div>
                          ) : products.length === 0 ? (
                            <div className="p-3 text-center text-xs text-slate-500">
                              لا توجد مطابقة في المخزون، يمكنك المتابعة وكتابة الاسم يدوياً
                            </div>
                          ) : (
                            products.slice(0, 7).map(prod => (
                              <button
                                key={prod.id}
                                type="button"
                                onClick={() => {
                                  handleSelectProduct(item.id, prod);
                                }}
                                className="flex w-full flex-col gap-0.5 rounded p-2 text-right transition-colors hover:bg-blue-50 dark:hover:bg-slate-800"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-800 dark:text-slate-100">
                                    {prod.name_ar}
                                  </span>
                                  <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">
                                    {prod.sku || 'بدون رقم'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                                  <span>التصنيف: {prod.category || 'عام'}</span>
                                  <span>الرصيد: {prod.quantity ?? 0}</span>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                  </td>

                  {/* Part Number (رقم القطعة) Cell */}
                  <td className="relative border border-slate-300 p-0 dark:border-slate-700">
                    <input
                      type="text"
                      dir="ltr"
                      value={item.partNumber}
                      placeholder="e.g. 12345-ABC"
                      onChange={e => {
                        const val = e.target.value.toUpperCase();
                        updateItem(item.id, { partNumber: val });
                      }}
                      className="h-9 w-full bg-transparent px-2.5 py-1 text-left font-mono text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400 focus:bg-blue-50/50 focus:text-blue-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-blue-950/30 dark:focus:text-blue-200"
                    />
                  </td>

                  {/* Manufacturer / Brand (الشركة الصانعة) Cell */}
                  <td className="border border-slate-300 p-0 dark:border-slate-700">
                    <input
                      type="text"
                      value={item.brand}
                      placeholder="تويوتا، بوش، دنسو..."
                      onChange={e => {
                        updateItem(item.id, { brand: e.target.value });
                      }}
                      className="h-9 w-full bg-transparent px-2.5 py-1 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:bg-blue-50/50 focus:text-blue-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-blue-950/30 dark:focus:text-blue-200"
                    />
                  </td>

                  {/* Quantity (الكمية) Cell */}
                  <td className="border border-slate-300 p-0 text-center dark:border-slate-700">
                    <div className="flex h-9 items-center justify-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        dir="ltr"
                        value={item.quantity || 1}
                        onChange={e => {
                          const normalized = normalizeArabicDigits(e.target.value);
                          const parsed = parseNumberFlexible(normalized);
                          const qty = !isNaN(parsed) && parsed > 0 ? parsed : 1;
                          updateItem(item.id, { quantity: qty });
                        }}
                        className="h-full w-full bg-transparent text-center font-mono text-xs font-bold text-blue-700 outline-none focus:bg-blue-100/60 dark:text-blue-300 dark:focus:bg-blue-950/50"
                      />
                    </div>
                  </td>

                  {/* Notes (ملاحظات) Cell */}
                  <td className="border border-slate-300 p-0 dark:border-slate-700">
                    <input
                      type="text"
                      value={item.notes || ''}
                      placeholder="موديل، سنة الصنع، مواصفات خاصة..."
                      onChange={e => {
                        updateItem(item.id, { notes: e.target.value });
                      }}
                      className="h-9 w-full bg-transparent px-2.5 py-1 text-xs text-slate-600 outline-none placeholder:text-slate-400 focus:bg-blue-50/50 focus:text-slate-900 dark:text-slate-300 dark:placeholder:text-slate-500 dark:focus:bg-blue-950/30 dark:focus:text-white"
                    />
                  </td>

                  {/* Actions (إجراءات) */}
                  <td className="no-print border border-slate-300 px-1 py-1 text-center dark:border-slate-700">
                    <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => {
                          duplicateItem(item.id);
                        }}
                        title="تكرار السطر"
                        className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          moveItem(index, index - 1);
                        }}
                        disabled={index === 0}
                        title="تحريك لأعلى"
                        className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30 dark:hover:bg-slate-800"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          moveItem(index, index + 1);
                        }}
                        disabled={index === items.length - 1}
                        title="تحريك لأسفل"
                        className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-30 dark:hover:bg-slate-800"
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          removeItem(item.id);
                        }}
                        title="حذف السطر"
                        className="rounded p-1 text-rose-500 hover:bg-rose-100 hover:text-rose-700 dark:hover:bg-rose-950/60"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Table Footer with Summary */}
          <tfoot>
            <tr className="bg-slate-100 font-bold text-slate-800 dark:bg-slate-800/90 dark:text-slate-200">
              <td
                colSpan={4}
                className="border border-slate-300 px-4 py-2.5 text-left dark:border-slate-700"
              >
                <span>إجمالي الأصناف المعبأة: </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {nonEmptyCount}
                </span>{' '}
                <span>من إجمالي {items.length} سطر | إجمالي الكمية المطلوبة:</span>
              </td>
              <td className="border border-slate-300 px-2 py-2.5 text-center font-mono text-sm font-bold text-blue-700 dark:border-slate-700 dark:text-blue-300">
                {totalQuantity}
              </td>
              <td
                colSpan={2}
                className="border border-slate-300 px-3 py-2.5 text-left text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400"
              >
                💡 تعديل أي حقل هنا لا يغيّر بيانات المخزن الأصلية
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Quick Add Row Button */}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={() => {
            addItem();
          }}
          className="shadow-2xs flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-emerald-500 hover:bg-emerald-50/50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/30"
        >
          <Plus size={14} className="text-emerald-600" />
          <span>+ إضافة سطر صنف جديد</span>
        </button>

        <span className="text-[11px] text-slate-400">
          يمكنك الضغط على أي خلية للتعديل المباشر أو لصق نصوص متعددة
        </span>
      </div>
    </div>
  );
};
