import { describe, it, expect, beforeEach } from 'vitest';
import { useSalesStore } from './store';
import { useDiscountStore } from '../settings/taxDiscountStore';

describe('Sales Store Logic', () => {
  beforeEach(() => {
    useSalesStore.getState().resetCart();
    // Default: discount disabled
    useDiscountStore.setState({ discountEnabled: false });
  });

  it('should initialize with empty items', () => {
    const { items, summary } = useSalesStore.getState();
    expect(items).toHaveLength(0);
    expect(summary.totalAmount).toBe(0);
  });

  it('should calculate totals correctly when adding a product', () => {
    const product = {
      id: 'p1', name: 'Test Product', sku: 'TP-001', selling_price: 100, cost_price: 80, stock_quantity: 10, min_stock_level: 5, name_ar: 'منتج تجريبي', alternative_numbers: '', company_id: '1', part_number: '', brand: '', category: '', size: '', specifications: '', unit: 'piece', created_at: '', alternatives: [], compatibility: [], warehouse_distribution: [], total_purchases_qty: 0, total_sales_qty: 0, last_invoice_date: '', total_profit: 0, total_loss: 0, isLowStock: false
    };

    useSalesStore.getState().addProductToCart(product);

    const { items, summary } = useSalesStore.getState();
    const activeItem = items.find(i => i.productId === 'p1');

    expect(activeItem).toBeDefined();
    expect(activeItem?.price).toBe(100);
    expect(activeItem?.quantity).toBe(1);

    expect(summary.subtotal).toBe(100);
    expect(summary.totalAmount).toBe(100);
  });

  it('should apply discount correctly when enabled in settings', () => {
    // Enable discount in settings
    useDiscountStore.setState({ discountEnabled: true });

    const product = {
      id: 'p1', name: 'Product', sku: '123', selling_price: 100, cost_price: 50, stock_quantity: 10, min_stock_level: 1, name_ar: 'المنتج', alternative_numbers: '', company_id: '1', part_number: '', brand: '', category: '', size: '', specifications: '', unit: 'piece', created_at: '', alternatives: [], compatibility: [], warehouse_distribution: [], total_purchases_qty: 0, total_sales_qty: 0, last_invoice_date: '', total_profit: 0, total_loss: 0, isLowStock: false
    };

    useSalesStore.getState().addProductToCart(product);
    useSalesStore.getState().toggleColumn('showDiscount');

    const index = useSalesStore.getState().items.findIndex(i => i.productId === 'p1');
    useSalesStore.getState().updateItem(index, 'discount', 10);

    const { summary } = useSalesStore.getState();

    expect(summary.subtotal).toBe(100);
    expect(summary.discountAmount).toBe(10);
    expect(summary.totalAmount).toBe(90);
  });
});
