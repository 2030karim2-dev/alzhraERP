import React from 'react';
import { Package, TrendingUp, DollarSign, Hash, Calendar, Warehouse } from 'lucide-react';
import { cn } from '../../../core/utils';
import OEMNumbersDisplay from './OEMNumbersDisplay';
import SparklineChart from '../../../ui/base/SparklineChart';
import StockStatusBadge from './product_detail/StockStatusBadge';

interface ProductDetailSheetProps {
  product: {
    name: string;
    nameAr?: string;
    sku: string;
    partNumber: string;
    alternativeNumbers?: string[];
    brand?: string;
    category?: string;
    stockQuantity: number;
    minStockLevel: number;
    salePrice: number;
    costPrice?: number;
    lastSalePrice?: number;
    lastSaleDate?: string;
    warehouse?: string;
    image?: string;
    stockMovement?: number[];
  };
  className?: string;
  onEdit?: () => void;
}

const ProductDetailSheet: React.FC<ProductDetailSheetProps> = ({ product, className }) => {
  const profitMargin =
    product.costPrice && product.salePrice
      ? Math.round(((product.salePrice - product.costPrice) / product.salePrice) * 100)
      : null;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex gap-3">
        {product.image && (
          <img
            src={product.image}
            alt={product.nameAr || product.name}
            className="h-16 w-16 flex-shrink-0 rounded-2xl border border-[var(--app-border)] object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black leading-tight text-[var(--app-text)]">
            {product.nameAr || product.name}
          </h3>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold text-[var(--app-text-secondary)]">
              {product.sku}
            </span>
            {product.brand && (
              <span className="rounded bg-[var(--app-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--app-text-secondary)]">
                {product.brand}
              </span>
            )}
          </div>
          <div className="mt-1.5 origin-right scale-90">
            <StockStatusBadge quantity={product.stockQuantity} minLevel={product.minStockLevel} />
          </div>
        </div>
      </div>

      {/* OEM Numbers */}
      <div>
        <div className="mb-2 flex items-center gap-1.5">
          <Hash size={12} className="text-[var(--app-text-secondary)]" />
          <span className="text-[10px] font-bold uppercase text-[var(--app-text-secondary)]">
            أرقام القطعة
          </span>
        </div>
        <OEMNumbersDisplay
          partNumber={product.partNumber}
          {...(product.alternativeNumbers
            ? { alternativeNumbers: product.alternativeNumbers }
            : {})}
        />
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-[var(--app-bg)] p-3">
          <div className="mb-1 flex items-center gap-1.5">
            <DollarSign size={12} className="text-emerald-500" />
            <span className="text-[10px] font-semibold text-[var(--app-text-secondary)]">
              سعر البيع
            </span>
          </div>
          <p className="font-mono text-base font-black text-[var(--app-text)]">
            {product.salePrice.toLocaleString('en-US')} ريال
          </p>
        </div>
        {product.costPrice && (
          <div className="rounded-xl bg-[var(--app-bg)] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <TrendingUp size={12} className="text-blue-500" />
              <span className="text-[10px] font-semibold text-[var(--app-text-secondary)]">
                هامش الربح
              </span>
            </div>
            <p className="font-mono text-base font-black text-[var(--app-text)]">{profitMargin}%</p>
          </div>
        )}
        {product.lastSalePrice && (
          <div className="rounded-xl bg-[var(--app-bg)] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <Calendar size={12} className="text-violet-500" />
              <span className="text-[10px] font-semibold text-[var(--app-text-secondary)]">
                آخر سعر بيع
              </span>
            </div>
            <p className="font-mono text-base font-black text-[var(--app-text)]">
              {product.lastSalePrice.toLocaleString('en-US')} ريال
            </p>
          </div>
        )}
        {product.warehouse && (
          <div className="rounded-xl bg-[var(--app-bg)] p-3">
            <div className="mb-1 flex items-center gap-1.5">
              <Warehouse size={12} className="text-amber-500" />
              <span className="text-[10px] font-semibold text-[var(--app-text-secondary)]">
                المستودع
              </span>
            </div>
            <p className="truncate text-sm font-bold text-[var(--app-text)]">{product.warehouse}</p>
          </div>
        )}
      </div>

      {/* Stock Movement Sparkline */}
      {product.stockMovement && product.stockMovement.length > 1 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Package size={12} className="text-[var(--app-text-secondary)]" />
            <span className="text-[10px] font-bold uppercase text-[var(--app-text-secondary)]">
              حركة المخزون
            </span>
          </div>
          <div className="rounded-xl bg-[var(--app-bg)] p-3">
            <SparklineChart data={product.stockMovement} width={200} height={40} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailSheet;
