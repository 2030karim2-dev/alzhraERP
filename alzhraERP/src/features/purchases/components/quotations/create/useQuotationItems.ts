import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import type { Product } from '../../../../inventory/types';
import { createEmptyItemRow } from './draft';
import type { ItemRow, ProductModalState } from './types';

type ItemFieldUpdater = (index: number, field: keyof ItemRow, value: string | number) => void;
type ItemSearcher = (index: number, query?: string) => void;

export interface QuotationItemsController {
  items: ItemRow[];
  productModal: ProductModalState;
  updateItem: ItemFieldUpdater;
  addItem: () => void;
  removeItem: (index: number) => void;
  resetItems: () => void;
  openProductSearch: ItemSearcher;
  closeProductSearch: () => void;
  applyProduct: (product: Product) => void;
}

const isUsablePrice = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value !== 0;

/** Keep the original purchase-price → cost-price → zero precedence. */
const resolveProductUnitPrice = (product: Product): number => {
  if (isUsablePrice(product.purchase_price)) return product.purchase_price;
  if (isUsablePrice(product.cost_price)) return product.cost_price;
  return 0;
};

const useQuotationProductSelection = (
  setItems: Dispatch<SetStateAction<ItemRow[]>>
): Pick<
  QuotationItemsController,
  'productModal' | 'openProductSearch' | 'closeProductSearch' | 'applyProduct'
> => {
  const [productModal, setProductModal] = useState<ProductModalState>({
    isOpen: false,
    rowIndex: 0,
    query: '',
  });
  const openProductSearch = useCallback<ItemSearcher>((index, query = ''): void => {
    setProductModal({ isOpen: true, rowIndex: index, query });
  }, []);
  const closeProductSearch = useCallback((): void => {
    setProductModal(previous => ({ ...previous, isOpen: false }));
  }, []);
  const applyProduct = useCallback(
    (product: Product): void => {
      setItems(previous =>
        previous.map((item, index) =>
          index === productModal.rowIndex
            ? {
                ...item,
                productId: product.id,
                description: product.name,
                partNumber: (product as { part_number?: string }).part_number ?? '',
                size: product.size ?? '',
                unitPrice: resolveProductUnitPrice(product),
              }
            : item
        )
      );
      closeProductSearch();
    },
    [productModal.rowIndex, setItems, closeProductSearch]
  );
  return { productModal, openProductSearch, closeProductSearch, applyProduct };
};

/** Row editing is independent of product-picker state and form submission. */
export const useQuotationItems = (initialItems: ItemRow[]): QuotationItemsController => {
  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const selection = useQuotationProductSelection(setItems);
  const updateItem = useCallback<ItemFieldUpdater>((index, field, value): void => {
    setItems(previous =>
      previous.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  }, []);
  const addItem = useCallback((): void => {
    setItems(previous => [...previous, createEmptyItemRow()]);
  }, []);
  const removeItem = useCallback((index: number): void => {
    setItems(previous =>
      previous.length <= 1 ? previous : previous.filter((_, itemIndex) => itemIndex !== index)
    );
  }, []);
  const resetItems = useCallback((): void => {
    setItems([createEmptyItemRow()]);
  }, []);
  return { items, ...selection, updateItem, addItem, removeItem, resetItems };
};
