import React from 'react';
import { Plus, Eye as EyeIcon } from 'lucide-react';
import type { Product } from '../../../inventory/types';
import type { ColumnConfig } from '../../hooks/useProductTableConfig';

interface ProductSelectionTableRowProps {
  product: Product;
  index: number;
  visibleColumns: ColumnConfig[];
  effectiveBranchId: string | null;
  mode: 'sale' | 'purchase' | 'quotation';
  fontSizeClass: string;
  isFocused: boolean;
  onSelect: (product: Product) => void;
  onViewProduct: (product: Product) => void;
  onRowClick: (product: Product) => void;
  onMouseEnter: () => void;
}

export const ProductSelectionTableRow: React.FC<ProductSelectionTableRowProps> = ({
  product,
  index,
  visibleColumns,
  effectiveBranchId,
  mode,
  fontSizeClass,
  isFocused,
  onSelect,
  onViewProduct,
  onRowClick,
  onMouseEnter,
}) => {
  const renderCellContent = (col: ColumnConfig) => {
    switch (col.id) {
      case 'index':
        return <span className="font-mono opacity-50">{index + 1}</span>;
      case 'name':
        return <span className="block truncate text-sm font-bold">{product.name}</span>;
      case 'part_number':
        return (
          <span
            className="block truncate font-mono text-sm font-bold text-gray-700 dark:text-gray-300"
            dir="ltr"
          >
            {product.part_number || product.alternative_numbers || '---'}
          </span>
        );
      case 'brand':
        return (
          <span className="block truncate font-bold opacity-60">{product.brand || '---'}</span>
        );
      case 'branch': {
        const branchStock =
          product.warehouse_distribution?.find(w => w.warehouse_id === effectiveBranchId) ||
          product.warehouse_distribution?.[0];
        return (
          <span className="block truncate text-xs opacity-80">
            {branchStock?.warehouse_name || 'المستودع الرئيسي'}
          </span>
        );
      }
      case 'stock': {
        const qty = product.stock_quantity;
        const isLow = qty <= product.min_stock_level;
        return (
          <span className={`font-mono text-sm font-black ${isLow ? 'text-red-500' : ''}`}>
            {qty}
          </span>
        );
      }
      case 'price':
        return (
          <span className="font-mono text-sm font-black text-emerald-600 group-hover:text-white">
            {mode === 'purchase' ? product.cost_price : product.selling_price || product.sale_price}
          </span>
        );
      case 'size':
        return <span className="block truncate opacity-70">{product.size || '---'}</span>;
      case 'specs':
        return (
          <span className="block truncate opacity-70" title={product.specifications || ''}>
            {product.specifications || '---'}
          </span>
        );
      case 'actions':
        return (
          <div
            className="flex items-center justify-center gap-1 max-md:gap-1"
            onClick={e => {
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onSelect(product);
              }}
              className="rounded bg-emerald-100 p-1 text-emerald-600 transition-colors hover:bg-emerald-200 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 max-md:p-1"
              title="إضافة مباشرة بنقرة واحدة"
            >
              <Plus size={12} />
            </button>
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onViewProduct(product);
              }}
              className="rounded bg-gray-100 p-1 text-gray-600 transition-colors hover:bg-blue-100 hover:text-blue-600 dark:bg-slate-800 dark:hover:bg-slate-700 max-md:p-1"
              title="معاينة التفاصيل"
            >
              <EyeIcon size={12} />
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <tr
      onClick={() => {
        onRowClick(product);
      }}
      onMouseEnter={onMouseEnter}
      title="انقر مرتين أو اضغط Enter لإضافة المنتج للفاتورة"
      className={`group cursor-pointer outline-none transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20 ${fontSizeClass} ${
        isFocused ? 'bg-blue-100 ring-1 ring-blue-400 dark:bg-blue-900/40 dark:ring-blue-500' : ''
      }`}
    >
      {visibleColumns.map(col => (
        <td
          key={`${product.id}-${col.id}`}
          className={`border-l border-gray-200 px-2 py-1.5 last:border-l-0 dark:border-slate-700 ${
            col.id === 'index' || col.id === 'stock' || col.id === 'actions' ? 'text-center' : ''
          }`}
        >
          {renderCellContent(col)}
        </td>
      ))}
    </tr>
  );
};
