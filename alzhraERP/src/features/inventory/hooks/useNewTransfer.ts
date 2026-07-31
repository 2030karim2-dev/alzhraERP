import { useState } from 'react';
import { useInventoryMutations } from './useInventoryManagement';
import { useFeedbackStore } from '../../feedback/store';

export const useNewTransfer = (onSuccess: () => void) => {
    const { createTransfer, isTransferring } = useInventoryMutations();
    const { showToast } = useFeedbackStore();
    
    const [fromWh, setFromWh] = useState('');
    const [toWh, setToWh] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedItems, setSelectedItems] = useState<{ product: any, qty: number }[]>([]);
    const [productQuery, setProductQuery] = useState('');

    const handleAddItem = (p: any) => {
        if (selectedItems.find(i => i.product.id === p.id)) return;
        setSelectedItems([...selectedItems, { product: p, qty: 1 }]);
        setProductQuery('');
    };

    const handleRemoveItem = (id: string) => {
        setSelectedItems(selectedItems.filter(i => i.product.id !== id));
    };

    const handleUpdateQty = (id: string, qty: number) => {
        setSelectedItems(selectedItems.map(si => 
            si.product.id === id ? { ...si, qty: Math.max(1, qty) } : si
        ));
    };

    const handleSubmit = () => {
        if (!fromWh || !toWh || selectedItems.length === 0 || fromWh === toWh) {
            showToast("يرجى التأكد من اختيار مستودعين مختلفين وإضافة أصناف.", 'warning');
            return;
        }
        
        createTransfer({
            from_warehouse_id: fromWh,
            to_warehouse_id: toWh,
            notes: notes,
            items: selectedItems.map(i => ({ product_id: i.product.id, quantity: i.qty }))
        }, { 
            onSuccess: () => {
                reset();
                onSuccess();
            } 
        });
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
        fromWh, setFromWh,
        toWh, setToWh,
        notes, setNotes,
        selectedItems,
        productQuery, setProductQuery,
        handleAddItem,
        handleRemoveItem,
        handleUpdateQty,
        handleSubmit,
        isTransferring,
        isValid
    };
};
