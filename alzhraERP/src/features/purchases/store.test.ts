import { describe, it, expect, beforeEach } from 'vitest';
import { usePurchaseStore } from './store';
import { useDiscountStore } from '../settings/taxDiscountStore';

describe('Purchases Store Logic', () => {
  beforeEach(() => {
    usePurchaseStore.getState().resetCart();
    useDiscountStore.setState({ discountEnabled: false });
  });

  it('initializes with 6 empty rows and zero totals', () => {
    const { items, totals } = usePurchaseStore.getState();
    expect(items.length).toBeGreaterThanOrEqual(6);
    expect(totals.grandTotal).toBe(0);
    expect(totals.subTotal).toBe(0);
  });

  it('initializes items with given count when empty', () => {
    usePurchaseStore.setState({ items: [] });
    usePurchaseStore.getState().initializeItems(3);
    expect(usePurchaseStore.getState().items).toHaveLength(3);
  });

  it('does not re-initialize when cart has items', () => {
    usePurchaseStore.getState().initializeItems(2);
    usePurchaseStore.getState().updateItem(0, 'quantity', 5);
    usePurchaseStore.getState().initializeItems(10);
    expect(usePurchaseStore.getState().items[0].quantity).toBe(5);
  });

  it('adds a new empty item', () => {
    const before = usePurchaseStore.getState().items.length;
    usePurchaseStore.getState().addItem();
    expect(usePurchaseStore.getState().items).toHaveLength(before + 1);
  });

  it('keeps at least one item after remove', () => {
    usePurchaseStore.setState({
      items: [{ id: '1', productId: '', sku: '', partNumber: '', brand: '', name: '', quantity: 0, costPrice: 0, discount: 0 }],
    });
    usePurchaseStore.getState().removeItem(0);
    expect(usePurchaseStore.getState().items.length).toBeGreaterThanOrEqual(1);
  });

  it('updates item and recalculates totals', () => {
    usePurchaseStore.setState({
      items: [{ id: '1', productId: '', sku: '', partNumber: '', brand: '', name: '', quantity: 3, costPrice: 50, discount: 0 }],
    });
    usePurchaseStore.getState().updateItem(0, 'quantity', 5);
    const { items, totals } = usePurchaseStore.getState();
    expect(items[0].quantity).toBe(5);
    expect(totals.subTotal).toBe(250);
  });


  it('calculates totals from multiple items', () => {
    usePurchaseStore.setState({
      items: [
        { id: '1', productId: 'p1', sku: '', partNumber: '', brand: '', name: 'A', quantity: 2, costPrice: 100, discount: 0 },
        { id: '2', productId: 'p2', sku: '', partNumber: '', brand: '', name: 'B', quantity: 3, costPrice: 50, discount: 0 },
      ],
    });
    usePurchaseStore.getState().calculateTotals();
    const { totals } = usePurchaseStore.getState();
    expect(totals.subTotal).toBe(350);
    expect(totals.grandTotal).toBe(350);
  });

  it('applies discount when enabled', () => {
    useDiscountStore.setState({ discountEnabled: true });
    usePurchaseStore.getState().toggleColumn('showDiscount');
    usePurchaseStore.setState({
      items: [{ id: '1', productId: '', sku: '', partNumber: '', brand: '', name: '', quantity: 10, costPrice: 100, discount: 50 }],
    });
    usePurchaseStore.getState().calculateTotals();
    const { totals } = usePurchaseStore.getState();
    expect(totals.subTotal).toBe(1000);
    expect(totals.totalDiscount).toBe(50);
    expect(totals.grandTotal).toBe(950);
  });

  it('ignores discount when disabled', () => {
    useDiscountStore.setState({ discountEnabled: false });
    usePurchaseStore.getState().toggleColumn('showDiscount');
    usePurchaseStore.setState({
      items: [{ id: '1', productId: '', sku: '', partNumber: '', brand: '', name: '', quantity: 10, costPrice: 100, discount: 50 }],
    });
    usePurchaseStore.getState().calculateTotals();
    expect(usePurchaseStore.getState().totals.grandTotal).toBe(1000);
    expect(usePurchaseStore.getState().totals.totalDiscount).toBe(0);
  });

  it('sets and clears supplier', () => {
    usePurchaseStore.getState().setSupplier({ id: 'sup1', name: 'Test' });
    expect(usePurchaseStore.getState().supplier?.name).toBe('Test');
    usePurchaseStore.getState().setSupplier(null);
    expect(usePurchaseStore.getState().supplier).toBeNull();
  });

  it('sets metadata fields', () => {
    usePurchaseStore.getState().setMetadata('currency', 'USD');
    usePurchaseStore.getState().setMetadata('exchangeRate', 3.75);
    expect(usePurchaseStore.getState().currency).toBe('USD');
    expect(usePurchaseStore.getState().exchangeRate).toBe(3.75);
  });

  it('toggles showDiscount', () => {
    expect(usePurchaseStore.getState().showDiscount).toBe(false);
    usePurchaseStore.getState().toggleColumn('showDiscount');
    expect(usePurchaseStore.getState().showDiscount).toBe(true);
  });

  it('resets cart to defaults', () => {
    usePurchaseStore.getState().setSupplier({ id: 's1', name: 'S' });
    usePurchaseStore.getState().setMetadata('currency', 'USD');
    usePurchaseStore.getState().resetCart();
    const s = usePurchaseStore.getState();
    expect(s.supplier).toBeNull();
    expect(s.currency).toBe('SAR');
    expect(s.exchangeRate).toBe(1);
    expect(s.totals.grandTotal).toBe(0);
  });

  it('loads bulk items with unitPrice fallback', () => {
    usePurchaseStore.setState({ items: [] });
    usePurchaseStore.getState().bulkLoadItems([
      { productId: 'p1', name: 'B', quantity: 1, unitPrice: 75 },
    ]);
    expect(usePurchaseStore.getState().items[0].costPrice).toBe(75);
  });

  it('clears invoice metadata when starting a new purchase invoice', () => {
    usePurchaseStore.getState().setMetadata('notes', 'ملاحظة قديمة');
    usePurchaseStore.getState().setMetadata('warehouseId', 'warehouse-2');
    usePurchaseStore.getState().toggleColumn('showDiscount');

    usePurchaseStore.getState().resetCart();
    const state = usePurchaseStore.getState();

    expect(state.notes).toBe('');
    expect(state.warehouseId).toBe('wh_main');
    expect(state.showDiscount).toBe(false);
  });
});
