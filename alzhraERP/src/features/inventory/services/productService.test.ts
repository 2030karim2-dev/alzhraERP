import { describe, it, expect, vi, beforeEach } from 'vitest';
import { productService } from './productService';
import type { ProductFormData } from '../types';

// ── Mock supabase client — سلاسل استعلام من طابور حسب ترتيب الاستدعاء ────────
const { mockFrom, mockRpc } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
}));

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: { from: mockFrom, rpc: mockRpc },
}));

// ── Mock inventoryApi ────────────────────────────────────────────────────────
const { mockInventoryApi } = vi.hoisted(() => ({
  mockInventoryApi: {
    getProducts: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    getProductById: vi.fn(),
    deleteProduct: vi.fn(),
    bulkDeleteProducts: vi.fn(),
    saveProductUoMs: vi.fn(),
    initializeStock: vi.fn(),
  },
}));

vi.mock('../api', () => ({ inventoryApi: mockInventoryApi }));

interface MockQueryResult {
  data: unknown;
  error?: unknown;
}

/** سلسلة استعلام وهمية thenable: كل البواني يعيدون السلسلة، و `await` يُحل بالنتيجة أياً كان الترتيب. */
const buildChain = (result: MockQueryResult) => {
  const chain: Record<string, unknown> = {};
  for (const method of ['select', 'eq', 'is', 'ilike', 'or', 'order', 'limit', 'lt']) {
    chain[method] = vi.fn(() => chain);
  }
  const promise = Promise.resolve(result);
  chain.then = promise.then.bind(promise);
  chain.catch = promise.catch.bind(promise);
  return chain;
};

/** يضيف استعلاماً متوقعاً إلى الطابور (منتجات/مستودعات...) بترتيب الاستدعاء. */
const enqueueQuery = (result: MockQueryResult): void => {
  mockFrom.mockImplementationOnce(() => buildChain(result));
};

const makeDto = (overrides: Partial<ProductFormData> = {}): ProductFormData => ({
  name: 'فلتر زيت أصلي',
  selling_price: 25.5,
  cost_price: 10,
  min_stock_level: 5,
  ...overrides,
});

describe('productService.mapRawProducts', () => {
  it('يتجاهل الصفوف بلا معرّف ويوحد الأسماء الاحتياطية', () => {
    const rows = [
      { id: 'p1', name_ar: 'فلتر', sale_price: '30', stock: [] },
      { name_ar: 'بلا معرف' },
      null,
    ];

    const result = productService.mapRawProducts(rows);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'p1',
      name_ar: 'فلتر',
      name: 'فلتر',
      sku: '---',
      part_number: '---',
      sale_price: 30,
      cost_price: 0,
    });
  });

  it('يجمع المخزون عبر كل المستودعات افتراضياً ويحدد isLowStock', () => {
    const result = productService.mapRawProducts([
      {
        id: 'p1',
        name_ar: 'قطعة',
        min_stock_level: 10,
        stock: [
          { warehouse_id: 'w1', quantity: 4 },
          { warehouse_id: 'w2', quantity: 3 },
        ],
      },
    ]);

    expect(result[0].stock_quantity).toBe(7);
    expect(result[0].isLowStock).toBe(true);
    expect(result[0].warehouse_distribution).toHaveLength(2);
  });

  it('يعزل المخزون على المستودع المحدد فقط عند تمرير warehouseId', () => {
    const result = productService.mapRawProducts(
      [
        {
          id: 'p1',
          name_ar: 'قطعة',
          stock: [
            { warehouse_id: 'w1', quantity: 4, warehouses: { name_ar: 'الرئيسي' } },
            { warehouse_id: 'w2', quantity: 9, warehouses: { name_ar: 'الفرعي' } },
          ],
        },
      ],
      'w2'
    );

    expect(result[0].stock_quantity).toBe(9);
    expect(result[0].isLowStock).toBe(false);
  });

  it('يبني الموقع من أسماء المستودعات الفريدة مع رف التخزين', () => {
    const result = productService.mapRawProducts([
      {
        id: 'p1',
        name_ar: 'قطعة',
        location: 'رف 3',
        stock: [
          { warehouse_id: 'w1', quantity: 1, warehouses: { name_ar: 'الرئيسي' } },
          { warehouse_id: 'w2', quantity: 2, warehouses: { name_ar: 'الرئيسي' } },
          { warehouse_id: 'w3', quantity: 1, warehouses: { name_ar: 'الفرعي' } },
        ],
      },
    ]);

    expect(result[0].location).toBe('الرئيسي, الفرعي (رف 3)');
    expect(result[0].category).toBe('عام');
  });

  it('يقسم الأرقام البديلة بالفواصل ويزيل الفراغات', () => {
    const result = productService.mapRawProducts([
      { id: 'p1', name_ar: 'قطعة', alternative_numbers: ' 90915 , 90915-YZZD1 , ' },
    ]);

    expect(result[0].alternatives).toEqual(['90915', '90915-YZZD1', '']);
  });
});

describe('productService.createProduct — منع التكرار داخل نطاق المنشأة', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it('يرفض اسم المنتج الفارغ قبل أي استعلام', async () => {
    await expect(
      productService.createProduct(makeDto({ name: '   ' }), 'comp-1', 'u1')
    ).rejects.toThrow('اسم المنتج مطلوب');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('يرفض تكرار اسم المنتج برسالة عربية صريحة', async () => {
    enqueueQuery({ data: [{ id: 'p-old', name_ar: 'فلتر زيت أصلي' }] });

    await expect(productService.createProduct(makeDto(), 'comp-1', 'u1')).rejects.toThrow(
      'يوجد منتج مسجل مسبقاً بنفس الاسم: "فلتر زيت أصلي"'
    );
  });

  it('يرفض تكرار SKU مع ذكر المنتج المصادم', async () => {
    enqueueQuery({ data: [] }); // فحص الاسم
    enqueueQuery({ data: [{ id: 'p-old', name_ar: 'قطعة قديمة', sku: 'SKU-1' }] });

    await expect(
      productService.createProduct(makeDto({ sku: ' SKU-1 ' }), 'comp-1', 'u1')
    ).rejects.toThrow('رمز الصنف (SKU: SKU-1) مسجل مسبقاً للمنتج: "قطعة قديمة"');
  });

  it('يرفض تكرار الباركود مع ذكر المنتج المصادم', async () => {
    enqueueQuery({ data: [] }); // فحص الاسم (لا SKU في المدخلات → لا فحص SKU)
    enqueueQuery({ data: [{ id: 'p-old', name_ar: 'قطعة قديمة', barcode: '123456' }] });

    await expect(
      productService.createProduct(makeDto({ barcode: '123456' }), 'comp-1', 'u1')
    ).rejects.toThrow('الباركود (123456) مسجل مسبقاً للمنتج: "قطعة قديمة"');
  });

  it('يرفض تكرار رقم القطعة مع نفس الماركة', async () => {
    enqueueQuery({ data: [] }); // الاسم (لا SKU ولا باركود → يُتخطى فحصهما)
    enqueueQuery({ data: [{ id: 'p-old', name_ar: 'قطعة قديمة' }] }); // قطعة+ماركة

    await expect(
      productService.createProduct(
        makeDto({ part_number: '90915', brand: 'Toyota' }),
        'comp-1',
        'u1'
      )
    ).rejects.toThrow('رقم القطعة (90915 - Toyota) مسجل مسبقاً للمنتج: "قطعة قديمة"');
  });

  it('يُنشئ المنتج ويهيئ المخزون في أول مستودع عند النجاح', async () => {
    enqueueQuery({ data: [] }); // الاسم
    enqueueQuery({ data: [] }); // SKU (موجود في المدخلات)
    // لا باركود ولا رقم قطعة → يُتخطى فحصهما
    mockInventoryApi.createProduct.mockResolvedValue({ data: { id: 'p-new' }, error: null });
    enqueueQuery({ data: [{ id: 'w1' }] }); // أول مستودع
    mockInventoryApi.initializeStock.mockResolvedValue({ data: null, error: null });

    const result = await productService.createProduct(
      makeDto({ sku: 'SKU-9', stock_quantity: 12, category: 'x' }),
      'comp-1',
      'user-1'
    );

    expect(result).toEqual({ id: 'p-new' });
    expect(mockInventoryApi.createProduct).toHaveBeenCalledTimes(1);
    const payload = mockInventoryApi.createProduct.mock.calls[0][0];
    expect(payload).toMatchObject({
      company_id: 'comp-1',
      name_ar: 'فلتر زيت أصلي',
      sku: 'SKU-9',
      sale_price: 25.5,
      purchase_price: 10,
      status: 'active',
    });
    // category بطول غير 36 → null (حماية من قيم غير UUID)
    expect(payload.category_id).toBeNull();
    expect(mockInventoryApi.initializeStock).toHaveBeenCalledWith('comp-1', 'user-1', {
      product_id: 'p-new',
      warehouse_id: 'w1',
      quantity: 12,
    });
  });

  it('يحوّل خطأ التكرار 23505 من الخادم إلى رسالة مُفسَّرة عبر parseError', async () => {
    enqueueQuery({ data: [] }); // الاسم
    enqueueQuery({ data: [] }); // SKU (موجود)
    mockInventoryApi.createProduct.mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });

    const err = await productService
      .createProduct(makeDto({ sku: 'SKU-DUP' }), 'comp-1', 'u1')
      .then(
        () => null,
        (e: unknown) => e as Error
      );

    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toContain('موجود مسبقاً');
  });
});

describe('productService.searchProducts — RPC مع بديل ILIKE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    mockRpc.mockReset();
  });

  it('يعيد نتائج RPC بعد تطبيع مصطلح البحث دون لمس الجدول', async () => {
    mockRpc.mockResolvedValue({
      data: [
        { id: 'p1', name_ar: 'فلتر', sku: 'S1', part_number: '90915', brand: 'T', size: null },
      ],
      error: null,
    });

    const result = await productService.searchProducts('comp-1', '  فلتر  ');

    expect(mockRpc).toHaveBeenCalledWith(
      'search_inventory_paginated',
      expect.objectContaining({ p_company_id: 'comp-1', p_limit: 50, p_offset: 0 })
    );
    expect(result).toEqual([
      {
        id: 'p1',
        name: 'فلتر',
        name_ar: 'فلتر',
        sku: 'S1',
        part_number: '90915',
        brand: 'T',
        size: null,
        stock_quantity: 0,
        warehouse_distribution: [],
      },
    ]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('يرجع إلى بحث ILIKE داخل الجدول عند فشل RPC', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC missing' } });
    enqueueQuery({
      data: [{ id: 'p2', name_ar: 'بلوة', sku: null, part_number: null, brand: null, size: null }],
    });

    const result = await productService.searchProducts('comp-1', 'بلوة');

    expect(mockFrom).toHaveBeenCalledWith('products');
    expect(result[0]).toMatchObject({ id: 'p2', name: 'بلوة', sku: null });
  });
});

describe('productService.getMinimalProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
  });

  it('يعيد قائمة مبسطة مع سعر افتراضي صفر عند غياب السعر', async () => {
    enqueueQuery({
      data: [
        { id: 'p1', name_ar: 'قطعة أ', sku: 'A', sale_price: 15 },
        { id: 'p2', name_ar: 'قطعة ب', sku: null, sale_price: null },
      ],
    });

    const result = await productService.getMinimalProducts('comp-1');

    expect(result).toEqual([
      { id: 'p1', name: 'قطعة أ', sku: 'A', selling_price: 15 },
      { id: 'p2', name: 'قطعة ب', sku: null, selling_price: 0 },
    ]);
  });

  it('يرمي خطأ الاستعلام الخام بدلاً من ابتلاعه', async () => {
    enqueueQuery({ data: null, error: { message: 'boom' } });

    const err = await productService.getMinimalProducts('comp-1').then(
      () => null,
      (e: unknown) => e
    );

    expect(err).toEqual({ message: 'boom' });
  });
});
