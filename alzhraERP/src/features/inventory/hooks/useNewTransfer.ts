import { useState } from 'react';
import { useInventoryMutations } from './useInventoryManagement';
import { useFeedbackStore } from '../../feedback/store';
import { logger } from '../../../core/utils/logger';

export const useNewTransfer = (onSuccess: () => void) => {
  const { createTransfer, isTransferring } = useInventoryMutations();
  const { showToast } = useFeedbackStore();

  const [fromWh, setFromWh] = useState('');
  const [toWh, setToWh] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<Array<{ product: any; qty: number }>>([]);
  const [productQuery, setProductQuery] = useState('');

  const handleAddItem = async (p: any) => {
    if (selectedItems.find(i => i.product.id === p.id)) return;

    let fullProduct = p;
    if (!fullProduct.warehouse_distribution) {
      try {
        const { inventoryService } = await import('../service');
        const res = await inventoryService.getProductById(p.id);
        if (res && res.data) {
          const mapped = (
            await import('./../services/productService')
          ).productService.mapRawProducts([res.data]);
          if (mapped && mapped.length > 0) {
            fullProduct = mapped[0];
          }
        }
      } catch (e) {
        logger.error('useNewTransfer', 'Failed to fetch full product details', e);
      }
    }

    setSelectedItems(prev => [...prev, { product: fullProduct, qty: 1 }]);
    setProductQuery('');
  };

  const handleRemoveItem = (id: string) => {
    setSelectedItems(selectedItems.filter(i => i.product.id !== id));
  };

  const handleUpdateQty = (id: string, qty: number) => {
    setSelectedItems(
      selectedItems.map(si => (si.product.id === id ? { ...si, qty: Math.max(1, qty) } : si))
    );
  };

  const handleSubmit = () => {
    if (!fromWh || !toWh || selectedItems.length === 0 || fromWh === toWh) {
      showToast('يرجى التأكد من اختيار مستودعين مختلفين وإضافة أصناف.', 'warning');
      return;
    }

    const invalidItems = selectedItems.filter(i => {
      const stockInfo = i.product.warehouse_distribution?.find(
        (w: any) => w.warehouse_id === fromWh
      );
      const availableQty = stockInfo ? Number(stockInfo.quantity) : 0;
      return i.qty > availableQty;
    });

    if (invalidItems.length > 0) {
      showToast(
        `عذراً، الكمية غير متوفرة في المستودع المصدر لـ: ${invalidItems.map(i => i.product.name_ar || i.product.name).join('، ')}`,
        'error'
      );
      return;
    }

    createTransfer(
      {
        from_warehouse_id: fromWh,
        to_warehouse_id: toWh,
        notes: notes,
        items: selectedItems.map(i => ({ product_id: i.product.id, quantity: i.qty })),
      },
      {
        onSuccess: () => {
          reset();
          onSuccess();
        },
      }
    );
  };

  const reset = () => {
    setFromWh('');
    setToWh('');
    setNotes('');
    setSelectedItems([]);
    setProductQuery('');
  };

  const isValid = fromWh && toWh && selectedItems.length > 0 && fromWh !== toWh;

  return {
    fromWh,
    setFromWh,
    toWh,
    setToWh,
    notes,
    setNotes,
    selectedItems,
    productQuery,
    setProductQuery,
    handleAddItem,
    handleRemoveItem,
    handleUpdateQty,
    handleSubmit,
    isTransferring,
    isValid,
  };
};
