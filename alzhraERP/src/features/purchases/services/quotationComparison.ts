/**
 * منطق مقارنة عروض أسعار الموردين (نقي — بلا React وبلا Supabase).
 *
 * Layer: features/purchases/services — دوال حسابية خالصة + تطبيع بيانات الخام.
 * مقتطعة من `QuotationComparisonView.tsx` لتسهيل الصيانة والاختبار المستقل.
 */

export interface ComparisonQuotationItem {
  id: string;
  product_id: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  size: string | null;
  part_number: string | null;
}

export interface ComparisonSupplier {
  id: string;
  quotation_number: string;
  status: string;
  total_amount: number;
  currency_code: string;
  exchange_rate: number | null;
  delivery_terms: string | null;
  payment_terms: string | null;
  party: { id?: string; name: string } | null;
  quotation_items: ComparisonQuotationItem[];
}

export interface QuotationPriceRange {
  min: number;
  max: number;
  minSupplier: string;
  minNormalized: number;
  maxNormalized: number;
}

export interface ComparisonItemMeta {
  size: string | null;
  part_number: string | null;
  quantity: number;
}

export interface QuotationComparisonResult {
  descriptions: string[];
  itemsMap: Map<string, ComparisonItemMeta>;
  priceMap: Map<string, QuotationPriceRange>;
  cheapestId: string;
  isMixedCurrencies: boolean;
  currencies: string[];
  normalizedTotals: Map<string, number>;
}

/** أسعار الصرف الافتراضية نحو الريال السعودي (1 ر.س = 410 ر.ي). */
export const DEFAULT_EXCHANGE_RATES_TO_SAR: Record<string, number> = {
  SAR: 1,
  USD: 3.75,
  YER: 1 / 410,
  CNY: 0.52,
  OMR: 9.75,
  EUR: 4.1,
  GBP: 4.8,
};

/**
 * نفس الجدول كـ `Map` للقراءة الآمنة — يمنع الوصول النقطي الديناميكي
 * (`security/detect-object-injection`) ويبقي الواجهة العامة كما هي.
 */
const DEFAULT_RATES_MAP: ReadonlyMap<string, number> = new Map(
  Object.entries(DEFAULT_EXCHANGE_RATES_TO_SAR)
);

/** يطبّع سعراً معلناً إلى معامل ضرب نحو الريال السعودي. */
const toSarFactor = (rate: number, currencyCode: string): number =>
  currencyCode === 'YER' && rate > 1 ? 1 / rate : rate;

/**
 * يحل سعر الصرف نحو الريال السعودي بالترتيب: سعر العرض ← سعر المنشأة ← الافتراضي.
 */
export const getRateToSAR = (
  currencyCode: string,
  quotationRate?: number | null,
  dynamicRatesMap?: Map<string, number>
): number => {
  if (quotationRate !== undefined && quotationRate !== null && quotationRate > 0) {
    return toSarFactor(quotationRate, currencyCode);
  }
  const code = currencyCode.toUpperCase();
  const tenantRate = dynamicRatesMap?.get(code);
  if (tenantRate !== undefined && tenantRate > 0) {
    return toSarFactor(tenantRate, code);
  }
  return DEFAULT_RATES_MAP.get(code) ?? 1;
};

// ─── تطبيع البيانات الخام القادمة من الـ API ────────────────────────────────

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const asNullableString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null;

/** يطبّع بند عرض سعر واحد، ويعيد `null` إن لم يكن كائناً. */
export const normalizeComparisonItem = (value: unknown): ComparisonQuotationItem | null => {
  const row = asRecord(value);
  if (row === null) return null;
  const product = asRecord(row.product);
  const size = product !== null ? asString(product.size) : asString(row.size);
  const partNumber = product !== null ? asString(product.part_number) : '';
  return {
    id: asString(row.id),
    product_id: typeof row.product_id === 'string' ? row.product_id : null,
    description: asString(row.description),
    quantity: asNumber(row.quantity),
    unit_price: asNumber(row.unit_price),
    total: asNumber(row.total),
    size: asNullableString(size),
    part_number: asNullableString(partNumber),
  };
};

/** يطبّع عرض سعر مورد واحد، ويعيد `null` إن كان بلا معرّف. */
export const normalizeComparisonSupplier = (value: unknown): ComparisonSupplier | null => {
  const row = asRecord(value);
  if (row === null || asString(row.id) === '') return null;
  const party = asRecord(row.party);
  const items = Array.isArray(row.quotation_items)
    ? row.quotation_items
        .map(normalizeComparisonItem)
        .filter((item): item is ComparisonQuotationItem => item !== null)
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

/** يطبّع استجابة الـ API إلى قائمة عروض صالحة (تتجاهل كل صف غير صالح). */
export const normalizeComparisonSuppliers = (value: unknown): ComparisonSupplier[] =>
  Array.isArray(value)
    ? value
        .map(normalizeComparisonSupplier)
        .filter((supplier): supplier is ComparisonSupplier => supplier !== null)
    : [];

/** يقرأ رمز عملة قادم من بيانات غير موثوقة ويحوّله لأحرف كبيرة. */
export const asRateCode = (value: unknown): string =>
  typeof value === 'string' ? value.toUpperCase() : '';

/** يقرأ سعر صرف قادم من بيانات غير موثوقة، ويرجع 0 لأي قيمة غير صالحة. */
export const asRateValue = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

// ─── بناء مصفوفة المقارنة ──────────────────────────────────────────────────

interface ItemPriceEntry {
  id: string;
  price: number;
  normalizedPrice: number;
}

/** يجمع أوصاف البنود الفريدة عبر كل العروض (بترتيب ورودها). */
const collectDescriptions = (suppliers: ComparisonSupplier[]): string[] => [
  ...new Set(suppliers.flatMap(supplier => supplier.quotation_items.map(item => item.description))),
];

/** يحسب الإجمالي المعادل لكل عرض بعملة الأساس (ر.س). */
const buildNormalizedTotals = (
  suppliers: ComparisonSupplier[],
  dynamicRatesMap?: Map<string, number>
): Map<string, number> => {
  const totals = new Map<string, number>();
  for (const supplier of suppliers) {
    const rate = getRateToSAR(supplier.currency_code, supplier.exchange_rate, dynamicRatesMap);
    totals.set(supplier.id, supplier.total_amount * rate);
  }
  return totals;
};

/**
 * يستخرج بيانات وصف واحد عبر كل العروض: أول قياس/رقم قطعة غير فارغ،
 * آخر كمية أكبر من صفر، وأسعار كل مورد يقدّم هذا الوصف.
 */
const summarizeDescription = (
  suppliers: ComparisonSupplier[],
  description: string,
  dynamicRatesMap?: Map<string, number>
): { meta: ComparisonItemMeta; prices: ItemPriceEntry[] } => {
  let size: string | null = null;
  let partNumber: string | null = null;
  let quantity = 1;
  const prices: ItemPriceEntry[] = [];

  for (const supplier of suppliers) {
    const item = supplier.quotation_items.find(entry => entry.description === description);
    if (item === undefined) continue;
    if (size === null && item.size !== null) size = item.size;
    if (partNumber === null && item.part_number !== null) partNumber = item.part_number;
    if (item.quantity > 0) quantity = item.quantity;
    const rate = getRateToSAR(supplier.currency_code, supplier.exchange_rate, dynamicRatesMap);
    prices.push({
      id: supplier.id,
      price: item.unit_price,
      normalizedPrice: item.unit_price * rate,
    });
  }

  return { meta: { size, part_number: partNumber, quantity }, prices };
};

/** يحدد أرخص عرض لوصف ما (على الأسعار المعايرة عند تفعيل التوحيد). */
const pickCheapestEntry = (prices: ItemPriceEntry[], normalizeCurrency: boolean): ItemPriceEntry =>
  prices.reduce((current, entry) => {
    const compareVal = normalizeCurrency ? entry.normalizedPrice : entry.price;
    const currentVal = normalizeCurrency ? current.normalizedPrice : current.price;
    return compareVal < currentVal ? entry : current;
  }, prices[0]);

/** يبني حدود السعر الدنيا/العليا لهذا الوصف (خام ومعاير). */
const buildPriceRange = (
  prices: ItemPriceEntry[],
  normalizeCurrency: boolean
): QuotationPriceRange => {
  const raw = prices.map(entry => entry.price);
  const normalized = prices.map(entry => entry.normalizedPrice);
  return {
    min: Math.min(...raw),
    max: Math.max(...raw),
    minNormalized: Math.min(...normalized),
    maxNormalized: Math.max(...normalized),
    minSupplier: pickCheapestEntry(prices, normalizeCurrency).id,
  };
};

/** يحدد العرض الأوفر إجمالاً (الأول عند التعادل). */
const findCheapestSupplier = (
  suppliers: ComparisonSupplier[],
  normalizedTotals: Map<string, number>,
  normalizeCurrency: boolean
): ComparisonSupplier =>
  suppliers.reduce((current, supplier) => {
    if (normalizeCurrency) {
      const currentNorm = normalizedTotals.get(current.id) ?? current.total_amount;
      const supplierNorm = normalizedTotals.get(supplier.id) ?? supplier.total_amount;
      return supplierNorm < currentNorm ? supplier : current;
    }
    return supplier.total_amount < current.total_amount ? supplier : current;
  }, suppliers[0]);

/**
 * يبني نتيجة المقارنة الكاملة، ويعيد `null` إن لا توجد عروض.
 */
export const buildQuotationComparison = (
  suppliers: ComparisonSupplier[],
  normalizeCurrency: boolean,
  dynamicRatesMap?: Map<string, number>
): QuotationComparisonResult | null => {
  if (suppliers.length === 0) return null;

  const descriptions = collectDescriptions(suppliers);
  const itemsMap = new Map<string, ComparisonItemMeta>();
  const priceMap = new Map<string, QuotationPriceRange>();
  const normalizedTotals = buildNormalizedTotals(suppliers, dynamicRatesMap);

  for (const description of descriptions) {
    const { meta, prices } = summarizeDescription(suppliers, description, dynamicRatesMap);
    itemsMap.set(description, meta);
    if (prices.length > 0) priceMap.set(description, buildPriceRange(prices, normalizeCurrency));
  }

  const currencies = [
    ...new Set(suppliers.map(s => (s.currency_code !== '' ? s.currency_code : 'SAR'))),
  ];

  return {
    descriptions,
    itemsMap,
    priceMap,
    cheapestId: findCheapestSupplier(suppliers, normalizedTotals, normalizeCurrency).id,
    isMixedCurrencies: currencies.length > 1,
    currencies,
    normalizedTotals,
  };
};

/**
 * فارق السعر الإجمالي بين أغلى وأرخص عرض — `null` عندما يكون الفارق غير قابل
 * للاحتساب (عملات مختلطة بدون توحيد، أو أقل من عرضين).
 */
export const computeTotalDifference = (
  suppliers: ComparisonSupplier[],
  options: {
    isMixedCurrencies: boolean;
    normalizeCurrency: boolean;
    dynamicRatesMap?: Map<string, number>;
  }
): { value: number; currency: string } | null => {
  if (suppliers.length < 2) return null;

  if (!options.isMixedCurrencies) {
    const totals = suppliers.map(supplier => supplier.total_amount);
    return {
      value: Math.max(...totals) - Math.min(...totals),
      currency: suppliers[0].currency_code !== '' ? suppliers[0].currency_code : 'SAR',
    };
  }

  if (!options.normalizeCurrency) return null;

  const normalized = suppliers.map(
    s => s.total_amount * getRateToSAR(s.currency_code, s.exchange_rate, options.dynamicRatesMap)
  );
  return { value: Math.max(...normalized) - Math.min(...normalized), currency: 'SAR' };
};
