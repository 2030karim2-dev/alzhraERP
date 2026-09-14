import { describe, it, expect } from 'vitest';
import { computeTransferSuggestions } from './transferRebalancingEngine';
import type { Product, Warehouse } from '../../inventory/types';
import type { Branch } from '../../settings/types';

describe('transferRebalancingEngine — محرك اقتراح المناقلات اللوجستية الذكي', () => {
  const mockBranches: Branch[] = [
    { id: 'b-wael', name: 'فرع وائل', company_id: 'c1', integration_mode: 'full_integration' },
    { id: 'b-ghamdan', name: 'فرع غمدان', company_id: 'c1', integration_mode: 'full_integration' },
    { id: 'b-mohammed', name: 'فرع محمد', company_id: 'c1', integration_mode: 'inventory_only' },
  ];

  const mockWarehouses: Warehouse[] = [
    {
      id: 'w-wael',
      name_ar: 'مستودع وائل',
      company_id: 'c1',
      branch_id: 'b-wael',
      is_primary: true,
    },
    {
      id: 'w-ghamdan',
      name_ar: 'مستودع غمدان',
      company_id: 'c1',
      branch_id: 'b-ghamdan',
      is_primary: true,
    },
    {
      id: 'w-mohammed',
      name_ar: 'مستودع محمد',
      company_id: 'c1',
      branch_id: 'b-mohammed',
      is_primary: true,
    },
  ];

  const makeProduct = (overrides: Partial<Product>): Product => ({
    id: 'p1',
    company_id: 'c1',
    name: 'فلتر زيت تويوتا',
    name_ar: 'فلتر زيت تويوتا',
    sku: 'TOY-101',
    part_number: '90915-YZZE1',
    brand: 'Toyota',
    alternative_numbers: null,
    category: 'فلاتر',
    cost_price: 20,
    sale_price: 35,
    stock_quantity: 15,
    min_stock_level: 3,
    unit: 'pcs',
    specifications: '',
    size: '',
    ...overrides,
  });

  it('يعيد مصفوفة فارغة وملخصاً صفرياً عند غياب المنتجات أو المستودعات الكافية', () => {
    const result = computeTransferSuggestions({
      products: [],
      warehouses: mockWarehouses,
      branches: mockBranches,
    });
    expect(result.suggestions).toEqual([]);
    expect(result.summary.totalSuggestions).toBe(0);
    expect(result.summary.estimatedCapitalSaved).toBe(0);
  });

  it('يكتشف العجز في فرع والفائض في فرع آخر ويقترح كمية آمنة دون كسر حد الأمان للمصدر', () => {
    const product = makeProduct({
      id: 'p-brake',
      name_ar: 'قماشات فرامل',
      cost_price: 50,
      min_stock_level: 3,
      warehouse_distribution: [
        {
          warehouse_id: 'w-wael',
          warehouse_name: 'مستودع وائل',
          branch_id: 'b-wael',
          branch_name: 'فرع وائل',
          quantity: 0, // عجز تام
        },
        {
          warehouse_id: 'w-ghamdan',
          warehouse_name: 'مستودع غمدان',
          branch_id: 'b-ghamdan',
          branch_name: 'فرع غمدان',
          quantity: 10, // فائض (10 - 3 = 7 آمن)
        },
      ],
    });

    const { suggestions, summary } = computeTransferSuggestions({
      products: [product],
      warehouses: mockWarehouses,
      branches: mockBranches,
      activeBranchId: 'b-wael',
    });

    expect(suggestions).toHaveLength(1);
    const s = suggestions[0];
    expect(s.fromBranch.id).toBe('b-ghamdan');
    expect(s.toBranch.id).toBe('b-wael');
    // Buffer = threshold * 2 = 6. Deficit needed = 6 - 0 = 6. Safe surplus = 10 - 3 = 7. Transfer = min(7, 6) = 6.
    expect(s.suggestedQty).toBe(6);
    expect(s.priority).toBe('critical'); // نفاد تام
    expect(s.financialImpact).toBe(6 * 50); // 300 ريال
    expect(summary.totalUnitsToTransfer).toBe(6);
    expect(summary.estimatedCapitalSaved).toBe(300);
    expect(summary.criticalCount).toBe(1);
  });

  it('يميز الأصناف الرئيسية is_core المنعدمة بأولوية قصوى عاجل جداً', () => {
    const coreProduct = makeProduct({
      id: 'p-core',
      is_core: true,
      min_stock_level: 5,
      warehouse_distribution: [
        {
          warehouse_id: 'w-mohammed',
          branch_id: 'b-mohammed',
          warehouse_name: 'مستودع محمد',
          quantity: 0,
        },
        {
          warehouse_id: 'w-wael',
          branch_id: 'b-wael',
          warehouse_name: 'مستودع وائل',
          quantity: 15,
        },
      ],
    });

    const { suggestions } = computeTransferSuggestions({
      products: [coreProduct],
      warehouses: mockWarehouses,
      branches: mockBranches,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].priority).toBe('critical');
    expect(suggestions[0].priorityLabel).toContain('صنف رئيسي');
  });

  it('يرتب المقترحات بتقديم الفرع النشط activeBranchId في المقدمة', () => {
    const prod1 = makeProduct({
      id: 'p1',
      warehouse_distribution: [
        { warehouse_id: 'w-wael', branch_id: 'b-wael', warehouse_name: 'وائل', quantity: 15 },
        { warehouse_id: 'w-ghamdan', branch_id: 'b-ghamdan', warehouse_name: 'غمدان', quantity: 0 },
      ],
    });

    const prod2 = makeProduct({
      id: 'p2',
      warehouse_distribution: [
        {
          warehouse_id: 'w-ghamdan',
          branch_id: 'b-ghamdan',
          warehouse_name: 'غمدان',
          quantity: 15,
        },
        {
          warehouse_id: 'w-mohammed',
          branch_id: 'b-mohammed',
          warehouse_name: 'محمد',
          quantity: 0,
        },
      ],
    });

    // When active branch is b-mohammed, prod2 (targeted to b-mohammed) should come first!
    const { suggestions } = computeTransferSuggestions({
      products: [prod1, prod2],
      warehouses: mockWarehouses,
      branches: mockBranches,
      activeBranchId: 'b-mohammed',
    });

    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].toBranch.id).toBe('b-mohammed');
    expect(suggestions[1].toBranch.id).toBe('b-ghamdan');
  });
});
