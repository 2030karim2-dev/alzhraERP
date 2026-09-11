import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Scale,
  Shield,
  Trophy,
  Zap,
} from 'lucide-react';
import { purchaseQuotationsApi } from '../../api/quotationsApi';
import { formatCurrency } from '../../../../core/utils';
import { usePurchaseStore } from '../../store';
import { useAuthStore } from '../../../auth/store';
import { useCurrencies } from '../../../settings/hooks';
import { logger } from '../../../../core/utils/logger';

interface Props {
  rfqGroupId: string;
  onClose: () => void;
  onConvertToPurchase?: () => void;
}
interface SupplierData {
  id: string;
  quotation_number: string;
  status: string;
  total_amount: number;
  currency_code: string;
  exchange_rate?: number | null;
  delivery_terms: string | null;
  payment_terms: string | null;
  party: { id?: string; name: string } | null;
  quotation_items: QuotationItem[];
}
interface QuotationItem {
  id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  size?: string | null;
  part_number?: string | null;
}
interface PriceRange {
  min: number;
  max: number;
  minSupplier: string;
  minNormalized: number;
  maxNormalized: number;
}
interface ComparisonResult {
  descriptions: string[];
  itemsMap: Map<string, { size: string | null; part_number: string | null; quantity: number }>;
  priceMap: Map<string, PriceRange>;
  cheapestId: string;
  isMixedCurrencies: boolean;
  currencies: string[];
  normalizedTotals: Map<string, number>;
}

export const DEFAULT_EXCHANGE_RATES_TO_SAR: Record<string, number> = {
  SAR: 1,
  USD: 3.75,
  YER: 1 / 410, // 410 YER per 1 SAR
  CNY: 0.52,
  OMR: 9.75,
  EUR: 4.1,
  GBP: 4.8,
};

export const getRateToSAR = (
  currencyCode: string,
  quotationRate?: number | null,
  dynamicRatesMap?: Map<string, number>
): number => {
  if (quotationRate && quotationRate > 0) {
    if (currencyCode === 'YER' && quotationRate > 1) {
      return 1 / quotationRate;
    }
    return quotationRate;
  }
  const code = currencyCode.toUpperCase();
  const tenantRate = dynamicRatesMap?.get(code);
  if (tenantRate && tenantRate > 0) {
    if (code === 'YER' && tenantRate > 1) {
      return 1 / tenantRate;
    }
    return tenantRate;
  }
  return DEFAULT_EXCHANGE_RATES_TO_SAR[code] ?? 1;
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;
const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;
const normalizeItem = (value: unknown): QuotationItem | null => {
  const row = asRecord(value);
  if (row === null) return null;
  const product = asRecord(row.product);
  const size = product ? asString(product.size) : asString(row.size);
  const partNumber = product ? asString(product.part_number) : '';
  return {
    id: asString(row.id),
    product_id: typeof row.product_id === 'string' ? row.product_id : null,
    description: asString(row.description),
    quantity: asNumber(row.quantity),
    unit_price: asNumber(row.unit_price),
    total: asNumber(row.total),
    size: size.trim() !== '' ? size : null,
    part_number: partNumber.trim() !== '' ? partNumber : null,
  };
};
const normalizeSupplier = (value: unknown): SupplierData | null => {
  const row = asRecord(value);
  if (row === null || asString(row.id) === '') return null;
  const party = asRecord(row.party);
  const items = Array.isArray(row.quotation_items)
    ? row.quotation_items.map(normalizeItem).filter((item): item is QuotationItem => item !== null)
    : [];
  return {
    id: asString(row.id),
    quotation_number: asString(row.quotation_number),
    status: asString(row.status),
    total_amount: asNumber(row.total_amount),
    currency_code: asString(row.currency_code, 'SAR'),
    exchange_rate: typeof row.exchange_rate === 'number' ? row.exchange_rate : null,
    delivery_terms: typeof row.delivery_terms === 'string' ? row.delivery_terms : null,
    payment_terms: typeof row.payment_terms === 'string' ? row.payment_terms : null,
    party:
      party === null
        ? null
        : {
            ...(typeof party.id === 'string' ? { id: party.id } : {}),
            name: asString(party.name, 'مورد غير محدد'),
          },
    quotation_items: items,
  };
};
const normalizeSuppliers = (value: unknown): SupplierData[] =>
  Array.isArray(value)
    ? value.map(normalizeSupplier).filter((supplier): supplier is SupplierData => supplier !== null)
    : [];

const buildComparison = (
  suppliers: SupplierData[],
  normalizeCurrency: boolean,
  dynamicRatesMap?: Map<string, number>
): ComparisonResult | null => {
  if (suppliers.length === 0) return null;
  const descriptions = [
    ...new Set(
      suppliers.flatMap(supplier => supplier.quotation_items.map(item => item.description))
    ),
  ];
  const itemsMap = new Map<
    string,
    { size: string | null; part_number: string | null; quantity: number }
  >();
  const priceMap = new Map<string, PriceRange>();

  const normalizedTotals = new Map<string, number>();
  suppliers.forEach(supplier => {
    const rate = getRateToSAR(supplier.currency_code, supplier.exchange_rate, dynamicRatesMap);
    normalizedTotals.set(supplier.id, supplier.total_amount * rate);
  });

  descriptions.forEach(description => {
    let itemSize: string | null = null;
    let itemPartNumber: string | null = null;
    let itemQty = 1;

    const prices = suppliers.flatMap(supplier => {
      const item = supplier.quotation_items.find(entry => entry.description === description);
      if (item === undefined) return [];
      if (item.size && !itemSize) itemSize = item.size;
      if (item.part_number && !itemPartNumber) itemPartNumber = item.part_number;
      if (item.quantity > 0) itemQty = item.quantity;
      const rate = getRateToSAR(supplier.currency_code, supplier.exchange_rate, dynamicRatesMap);
      return [
        {
          id: supplier.id,
          price: item.unit_price,
          normalizedPrice: item.unit_price * rate,
        },
      ];
    });

    itemsMap.set(description, { size: itemSize, part_number: itemPartNumber, quantity: itemQty });

    if (prices.length > 0) {
      const cheapest = prices.reduce((current, entry) => {
        const compareVal = normalizeCurrency ? entry.normalizedPrice : entry.price;
        const currentVal = normalizeCurrency ? current.normalizedPrice : current.price;
        return compareVal < currentVal ? entry : current;
      }, prices[0]);

      priceMap.set(description, {
        min: Math.min(...prices.map(entry => entry.price)),
        max: Math.max(...prices.map(entry => entry.price)),
        minNormalized: Math.min(...prices.map(entry => entry.normalizedPrice)),
        maxNormalized: Math.max(...prices.map(entry => entry.normalizedPrice)),
        minSupplier: cheapest.id,
      });
    }
  });

  const currencies = [...new Set(suppliers.map(s => s.currency_code || 'SAR'))];
  const isMixedCurrencies = currencies.length > 1;

  const cheapestSupplier = suppliers.reduce((current, supplier) => {
    if (normalizeCurrency) {
      const currentNorm = normalizedTotals.get(current.id) ?? current.total_amount;
      const supplierNorm = normalizedTotals.get(supplier.id) ?? supplier.total_amount;
      return supplierNorm < currentNorm ? supplier : current;
    }
    return supplier.total_amount < current.total_amount ? supplier : current;
  }, suppliers[0]);

  return {
    descriptions,
    itemsMap,
    priceMap,
    cheapestId: cheapestSupplier.id,
    isMixedCurrencies,
    currencies,
    normalizedTotals,
  };
};

const ComparisonHeader = ({
  suppliersCount,
  expanded,
  onToggle,
  onClose,
  isMixedCurrencies,
  normalizeCurrency,
  onToggleNormalize,
}: {
  suppliersCount: number;
  expanded: boolean;
  onToggle: () => void;
  onClose: () => void;
  isMixedCurrencies: boolean;
  normalizeCurrency: boolean;
  onToggleNormalize: () => void;
}): React.ReactElement => (
  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50 p-4 dark:border-violet-800/30 dark:from-violet-900/20 dark:to-indigo-900/20">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-500/20">
        <Scale size={20} />
      </div>
      <div>
        <h3 className="font-bold text-gray-900 dark:text-white">مقارنة عروض الأسعار</h3>
        <p className="text-xs font-medium text-violet-600 dark:text-violet-400">
          {suppliersCount} عرض من {suppliersCount} مورد
        </p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      {isMixedCurrencies && (
        <button
          type="button"
          onClick={onToggleNormalize}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all ${
            normalizeCurrency
              ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30'
              : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300'
          }`}
          title="تحويل كافة الأسعار إلى الريال السعودي بناءً على أسعار الصرف الرسمية للمقارنة العادلة"
        >
          <ArrowRightLeft size={13} />
          <span>
            {normalizeCurrency ? 'معايرة العملات مفعّلة (ر.س)' : 'توحيد العملة للأساسية (ر.س)'}
          </span>
        </button>
      )}
      <button
        type="button"
        aria-label={expanded ? 'طي المقارنة' : 'توسيع المقارنة'}
        onClick={onToggle}
        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/20"
      >
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 dark:bg-slate-800 dark:hover:bg-slate-700"
      >
        إغلاق
      </button>
    </div>
  </div>
);

const PriceCell = ({
  item,
  priceRange,
  supplierId,
  currencyCode,
  exchangeRate,
  normalizeCurrency,
  dynamicRatesMap,
}: {
  item: QuotationItem | undefined;
  priceRange: PriceRange | undefined;
  supplierId: string;
  currencyCode: string;
  exchangeRate?: number | null | undefined;
  normalizeCurrency: boolean;
  dynamicRatesMap?: Map<string, number> | undefined;
}): React.ReactElement => {
  if (item === undefined) return <span className="text-gray-300 dark:text-slate-600">—</span>;
  const rate = getRateToSAR(currencyCode, exchangeRate, dynamicRatesMap);
  const isCheapest = priceRange?.minSupplier === supplierId;
  const normalizedUnitPrice = item.unit_price * rate;
  const isMostExpensive = normalizeCurrency
    ? priceRange?.maxNormalized === normalizedUnitPrice &&
      priceRange.maxNormalized !== priceRange.minNormalized
    : priceRange?.max === item.unit_price && priceRange.max !== priceRange.min;
  const color = isCheapest
    ? 'text-emerald-600 dark:text-emerald-400'
    : isMostExpensive
      ? 'text-rose-500 dark:text-rose-400'
      : 'text-gray-800 dark:text-gray-200';
  const itemTotal = item.total > 0 ? item.total : item.unit_price * item.quantity;
  const isForeign = currencyCode.toUpperCase() !== 'SAR';

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`font-mono text-sm font-bold ${color}`} dir="ltr">
        {formatCurrency(item.unit_price, currencyCode)}
      </span>
      {normalizeCurrency && isForeign && (
        <span className="font-mono text-[10px] text-violet-600 dark:text-violet-400" dir="ltr">
          ≈ {formatCurrency(normalizedUnitPrice, 'SAR')}
        </span>
      )}
      <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
        <span>الإجمالي:</span>
        <span className="font-mono font-medium" dir="ltr">
          {formatCurrency(itemTotal, currencyCode)}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="font-mono text-[10px] text-gray-400">الكمية: {item.quantity}</span>
        {isCheapest && (
          <span className="rounded bg-emerald-50 px-1 text-[10px] font-bold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
            الأقل سعراً
          </span>
        )}
      </div>
    </div>
  );
};

const ActionCell = ({
  supplier,
  cheapestId,
  actionLoading,
  onConvert,
}: {
  supplier: SupplierData;
  cheapestId: string;
  actionLoading: string | null;
  onConvert: (id: string) => Promise<void>;
}): React.ReactElement => {
  if (supplier.status === 'converted')
    return (
      <span className="flex items-center justify-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400">
        <CheckCircle size={14} /> تم التحويل
      </span>
    );
  return (
    <button
      onClick={() => {
        void onConvert(supplier.id);
      }}
      disabled={actionLoading !== null}
      className={`mx-auto flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-bold shadow-sm transition-all ${supplier.id === cheapestId ? 'bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-700' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'}`}
    >
      {actionLoading === supplier.id ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <ArrowRightLeft size={12} />
      )}
      {supplier.id === cheapestId ? 'اعتماد (موصى به)' : 'اعتماد'}
    </button>
  );
};

const ComparisonTable = ({
  suppliers,
  comparison,
  actionLoading,
  normalizeCurrency,
  dynamicRatesMap,
  onConvert,
}: {
  suppliers: SupplierData[];
  comparison: ComparisonResult;
  actionLoading: string | null;
  normalizeCurrency: boolean;
  dynamicRatesMap?: Map<string, number> | undefined;
  onConvert: (id: string) => Promise<void>;
}): React.ReactElement => (
  <div className="scroll-x-hint-surface overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50">
          <th className="sticky right-0 z-10 min-w-[170px] bg-gray-50 px-4 py-3 text-right text-xs font-bold text-gray-700 dark:bg-slate-800/50 dark:text-gray-300">
            المنتج / البند
          </th>
          <th className="min-w-[90px] bg-gray-50 px-3 py-3 text-center text-xs font-bold text-gray-700 dark:bg-slate-800/50 dark:text-gray-300">
            القياس
          </th>
          {suppliers.map(supplier => (
            <th key={supplier.id} className="min-w-[150px] px-4 py-3 text-center text-xs font-bold">
              <div className="flex flex-col items-center gap-1">
                <span
                  className={
                    supplier.id === comparison.cheapestId
                      ? 'font-bold text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-700 dark:text-gray-300'
                  }
                >
                  {supplier.party?.name ?? 'مورد غير محدد'}
                </span>
                <div className="flex items-center gap-1">
                  <span className="rounded bg-violet-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                    {supplier.currency_code}
                  </span>
                  {supplier.id === comparison.cheapestId && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <Trophy size={10} /> الأوفر
                    </span>
                  )}
                </div>
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {comparison.descriptions.map(description => {
          const itemMeta = comparison.itemsMap.get(description);
          return (
            <tr
              key={description}
              className="border-b border-gray-50 transition-colors hover:bg-gray-50 dark:border-slate-800/50 dark:hover:bg-slate-800/50"
            >
              <td className="sticky right-0 z-10 bg-[var(--app-surface)] px-4 py-3">
                <div className="font-medium text-gray-800 dark:text-gray-200">{description}</div>
                {itemMeta?.part_number && (
                  <span className="font-mono text-[10px] text-gray-400">
                    رقم القطعة: {itemMeta.part_number}
                  </span>
                )}
              </td>
              <td className="px-3 py-3 text-center">
                {itemMeta?.size ? (
                  <span className="inline-flex items-center rounded bg-violet-50 px-2 py-0.5 font-mono text-xs font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                    {itemMeta.size}
                  </span>
                ) : (
                  <span className="text-xs text-gray-300 dark:text-slate-600">—</span>
                )}
              </td>
              {suppliers.map(supplier => (
                <td key={supplier.id} className="px-4 py-3 text-center">
                  <PriceCell
                    item={supplier.quotation_items.find(item => item.description === description)}
                    priceRange={comparison.priceMap.get(description)}
                    supplierId={supplier.id}
                    currencyCode={supplier.currency_code}
                    exchangeRate={supplier.exchange_rate}
                    normalizeCurrency={normalizeCurrency}
                    dynamicRatesMap={dynamicRatesMap}
                  />
                </td>
              ))}
            </tr>
          );
        })}
        <SummaryRows
          suppliers={suppliers}
          comparison={comparison}
          normalizeCurrency={normalizeCurrency}
          dynamicRatesMap={dynamicRatesMap}
        />
        <tr className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/10 dark:to-indigo-900/10">
          <td className="sticky right-0 z-10 bg-violet-50 px-4 py-4 font-bold text-violet-700 dark:bg-violet-900/10 dark:text-violet-400">
            الإجراء
          </td>
          <td className="bg-violet-50 px-3 py-4 dark:bg-violet-900/10"></td>
          {suppliers.map(supplier => (
            <td key={supplier.id} className="px-4 py-4 text-center">
              <ActionCell
                supplier={supplier}
                cheapestId={comparison.cheapestId}
                actionLoading={actionLoading}
                onConvert={onConvert}
              />
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
);

const SummaryRows = ({
  suppliers,
  comparison,
  normalizeCurrency,
  dynamicRatesMap,
}: {
  suppliers: SupplierData[];
  comparison: ComparisonResult;
  normalizeCurrency: boolean;
  dynamicRatesMap?: Map<string, number> | undefined;
}): React.ReactElement => (
  <>
    <tr className="border-t-2 border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/30">
      <td className="sticky right-0 z-10 bg-gray-50 px-4 py-3 font-bold text-gray-800 dark:bg-slate-800/30 dark:text-gray-200">
        إجمالي العرض
      </td>
      <td className="bg-gray-50 px-3 py-3 dark:bg-slate-800/30"></td>
      {suppliers.map(supplier => {
        const isCheapest = supplier.id === comparison.cheapestId;
        const rate = getRateToSAR(supplier.currency_code, supplier.exchange_rate, dynamicRatesMap);
        const normalizedTotal =
          comparison.normalizedTotals.get(supplier.id) ?? supplier.total_amount * rate;
        const isForeign = supplier.currency_code.toUpperCase() !== 'SAR';
        return (
          <td key={supplier.id} className="px-4 py-3 text-center">
            <div className="flex flex-col items-center">
              <span
                className={`font-mono text-base font-bold ${isCheapest ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-800 dark:text-gray-200'}`}
                dir="ltr"
              >
                {formatCurrency(supplier.total_amount, supplier.currency_code)}
              </span>
              {normalizeCurrency && isForeign && (
                <span
                  className="font-mono text-xs font-semibold text-violet-600 dark:text-violet-400"
                  dir="ltr"
                >
                  ≈ {formatCurrency(normalizedTotal, 'SAR')}
                </span>
              )}
            </div>
          </td>
        );
      })}
    </tr>
    <tr className="bg-gray-50 dark:bg-slate-800/30">
      <td className="sticky right-0 z-10 bg-gray-50 px-4 py-3 font-medium text-gray-600 dark:bg-slate-800/30 dark:text-gray-400">
        شروط التسليم
      </td>
      <td className="bg-gray-50 px-3 py-3 dark:bg-slate-800/30"></td>
      {suppliers.map(supplier => (
        <td
          key={supplier.id}
          className="px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-400"
        >
          {supplier.delivery_terms ?? '—'}
        </td>
      ))}
    </tr>
    <tr className="bg-gray-50 dark:bg-slate-800/30">
      <td className="sticky right-0 z-10 bg-gray-50 px-4 py-3 font-medium text-gray-600 dark:bg-slate-800/30 dark:text-gray-400">
        شروط الدفع
      </td>
      <td className="bg-gray-50 px-3 py-3 dark:bg-slate-800/30"></td>
      {suppliers.map(supplier => (
        <td
          key={supplier.id}
          className="px-4 py-3 text-center text-xs text-gray-600 dark:text-gray-400"
        >
          {supplier.payment_terms ?? '—'}
        </td>
      ))}
    </tr>
  </>
);

const RecommendationsBar = ({
  suppliers,
  cheapestId,
  isMixedCurrencies,
  normalizeCurrency,
  dynamicRatesMap,
}: {
  suppliers: SupplierData[];
  cheapestId: string;
  isMixedCurrencies: boolean;
  normalizeCurrency: boolean;
  dynamicRatesMap?: Map<string, number> | undefined;
}): React.ReactElement => {
  const cheapest = suppliers.find(supplier => supplier.id === cheapestId);
  const uniformCurrency = !isMixedCurrencies ? suppliers[0]?.currency_code || 'SAR' : null;

  let difference: number | null = null;
  let diffCurrency = 'SAR';

  if (!isMixedCurrencies && suppliers.length >= 2) {
    const totals = suppliers.map(supplier => supplier.total_amount);
    difference = Math.max(...totals) - Math.min(...totals);
    diffCurrency = uniformCurrency ?? 'SAR';
  } else if (isMixedCurrencies && normalizeCurrency && suppliers.length >= 2) {
    const normalizedTotals = suppliers.map(
      s => s.total_amount * getRateToSAR(s.currency_code, s.exchange_rate, dynamicRatesMap)
    );
    difference = Math.max(...normalizedTotals) - Math.min(...normalizedTotals);
    diffCurrency = 'SAR';
  }

  return (
    <div className="border-t border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50 p-4 dark:border-slate-800 dark:from-emerald-900/10 dark:to-teal-900/10">
      <div className="flex flex-wrap items-center gap-4">
        {cheapest !== undefined && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2 shadow-sm dark:border-emerald-800/30 dark:bg-slate-800/80">
            <Trophy size={16} className="text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              الأوفر إجمالياً:
            </span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {cheapest.party?.name ?? 'مورد غير محدد'}
            </span>
            {isMixedCurrencies && normalizeCurrency && (
              <span className="text-[10px] text-violet-600 dark:text-violet-400">
                (بالمعادل السعودي)
              </span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 shadow-sm dark:border-blue-800/30 dark:bg-slate-800/80">
          <Zap size={16} className="text-blue-600" />
          <span className="text-xs font-bold text-blue-700 dark:text-blue-400">عدد العروض:</span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {suppliers.length}
          </span>
        </div>
        {isMixedCurrencies && !normalizeCurrency ? (
          <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 shadow-sm dark:border-amber-800/30 dark:bg-amber-900/20">
            <Shield size={16} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
              عروض بعملات متعددة:
            </span>
            <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
              يرجى تفعيل «توحيد العملة للأساسية» لاحتساب فارق السعر الدقيق
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 py-2 shadow-sm dark:border-violet-800/30 dark:bg-slate-800/80">
            <Shield size={16} className="text-violet-600" />
            <span className="text-xs font-bold text-violet-700 dark:text-violet-400">
              فارق السعر الإجمالي:
            </span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300" dir="ltr">
              {difference === null ? '—' : formatCurrency(difference, diffCurrency)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

const QuotationComparisonView: React.FC<Props> = ({ rfqGroupId, onClose, onConvertToPurchase }) => {
  const [suppliers, setSuppliers] = useState<SupplierData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [normalizeCurrency, setNormalizeCurrency] = useState(true);
  const { user } = useAuthStore();
  const { rates } = useCurrencies();

  const dynamicRatesMap = useMemo(() => {
    const map = new Map<string, number>();
    if (Array.isArray(rates.data)) {
      for (const r of rates.data) {
        const code = String(r.currency_code ?? '').toUpperCase();
        const rate = Number(r.rate_to_base);
        if (code && !map.has(code) && !isNaN(rate) && rate > 0) {
          map.set(code, rate);
        }
      }
    }
    return map;
  }, [rates.data]);

  const fetchComparison = useCallback(async (): Promise<void> => {
    if (rfqGroupId === '' || !user?.company_id) return;
    setLoading(true);
    try {
      const response = await purchaseQuotationsApi.getComparisonData(rfqGroupId, user.company_id);
      const rawData: unknown = response.data;
      setSuppliers(normalizeSuppliers(rawData));
    } finally {
      setLoading(false);
    }
  }, [rfqGroupId, user?.company_id]);

  useEffect(() => {
    void fetchComparison();
  }, [fetchComparison]);

  const comparison = useMemo(
    () => buildComparison(suppliers, normalizeCurrency, dynamicRatesMap),
    [suppliers, normalizeCurrency, dynamicRatesMap]
  );

  const handleConvertToPurchase = async (quotationId: string): Promise<void> => {
    const quotation = suppliers.find(supplier => supplier.id === quotationId);
    if (quotation === undefined) return;
    setActionLoading(quotationId);
    try {
      const { resetCart, setSupplier, bulkLoadItems } = usePurchaseStore.getState();
      resetCart();
      if (quotation.party !== null)
        setSupplier({ id: quotation.party.id ?? 'temp', name: quotation.party.name });
      if (quotation.quotation_items.length > 0)
        bulkLoadItems(
          quotation.quotation_items.map(item => ({
            productId: item.product_id ?? '',
            name: item.description,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            costPrice: item.unit_price,
          }))
        );
      await purchaseQuotationsApi.updateStatus(quotationId, 'converted');
      onClose();
      if (onConvertToPurchase !== undefined) onConvertToPurchase();
    } catch (error) {
      logger.error('QuotationComparisonView', 'Failed to convert purchase quotation:', error);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
      </div>
    );
  if (comparison === null)
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 py-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
        <Scale size={40} className="mx-auto mb-3 text-gray-300 dark:text-slate-600" />
        <p className="font-medium text-gray-500 dark:text-gray-400">لا توجد عروض للمقارنة</p>
      </div>
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-[var(--app-surface)] shadow-sm dark:border-slate-800">
      <ComparisonHeader
        suppliersCount={suppliers.length}
        expanded={expanded}
        onToggle={() => {
          setExpanded(value => !value);
        }}
        onClose={onClose}
        isMixedCurrencies={comparison.isMixedCurrencies}
        normalizeCurrency={normalizeCurrency}
        onToggleNormalize={() => {
          setNormalizeCurrency(val => !val);
        }}
      />
      {comparison.isMixedCurrencies && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300">
          <div className="flex items-center gap-2">
            <Shield size={15} className="shrink-0 text-amber-600" />
            <span>
              العروض تشمل عملات متعددة ({comparison.currencies.join(' ، ')}).
              {normalizeCurrency
                ? ' تم توحيد الأسعار للريال السعودي (ر.س) وفق أسعار الصرف للمقارنة العادلة.'
                : ' المقارنة الحالية بالأرقام المجردة بدون مراعاة أسعار الصرف.'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setNormalizeCurrency(val => !val)}
            className="font-bold underline transition-colors hover:text-amber-950 dark:hover:text-white"
          >
            {normalizeCurrency ? 'إلغاء توحيد العملات' : 'تفعيل توحيد العملات'}
          </button>
        </div>
      )}
      {expanded && (
        <>
          <ComparisonTable
            suppliers={suppliers}
            comparison={comparison}
            actionLoading={actionLoading}
            normalizeCurrency={normalizeCurrency}
            dynamicRatesMap={dynamicRatesMap}
            onConvert={handleConvertToPurchase}
          />
          <RecommendationsBar
            suppliers={suppliers}
            cheapestId={comparison.cheapestId}
            isMixedCurrencies={comparison.isMixedCurrencies}
            normalizeCurrency={normalizeCurrency}
            dynamicRatesMap={dynamicRatesMap}
          />
        </>
      )}
    </div>
  );
};
export default QuotationComparisonView;
