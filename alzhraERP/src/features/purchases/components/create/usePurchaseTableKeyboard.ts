/* eslint-disable max-lines-per-function, complexity, security/detect-object-injection, @typescript-eslint/explicit-function-return-type */
import { useCallback, useState } from 'react';
import type React from 'react';
import type { PurchaseInvoiceItem } from '../../store';
import type { Product } from '../../../inventory/types';

interface ModalState { isOpen: boolean; rowIndex: number; query: string; }
type TableRef = React.RefObject<HTMLTableElement | null>;
type SetProduct = (index: number, product: Product) => void;
type AddItem = () => void;

interface UsePurchaseTableKeyboardArgs {
    tableRef: TableRef;
    itemCount: number;
    showDiscount: boolean;
    setProductForRow: SetProduct;
    addItem: AddItem;
}

const focusCell = (tableRef: TableRef, row: number, field: keyof PurchaseInvoiceItem): void => {
    const selector = `[data-row-index="${row.toString()}"][data-col-field="${field}"]`;
    const cell = tableRef.current?.querySelector<HTMLInputElement>(selector);
    cell?.focus();
    cell?.select();
};

export const usePurchaseTableKeyboard = ({ tableRef, itemCount, showDiscount, setProductForRow, addItem }: UsePurchaseTableKeyboardArgs) => {
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, rowIndex: 0, query: '' });

    const handleOpenSearch = useCallback((index: number, query = ''): void => {
        setModalState({ isOpen: true, rowIndex: index, query });
    }, []);

    const handleProductSelect = useCallback((product: Product): void => {
        const rowIndex = modalState.rowIndex;
        setProductForRow(rowIndex, product);
        setModalState((current) => ({ ...current, isOpen: false }));
        window.setTimeout(() => { focusCell(tableRef, rowIndex, 'quantity'); }, 50);
    }, [modalState.rowIndex, setProductForRow, tableRef]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, field: keyof PurchaseInvoiceItem): void => {
        if (field === 'name' && (event.key === 'Enter' || (event.key.length === 1 && !event.ctrlKey && !event.metaKey))) {
            event.preventDefault();
            handleOpenSearch(rowIndex, event.key.length === 1 ? event.key : '');
            return;
        }

        const fieldsOrder: Array<keyof PurchaseInvoiceItem> = ['name', 'quantity', 'costPrice'];
        if (showDiscount) fieldsOrder.push('discount');
        const columnIndex = fieldsOrder.indexOf(field);
        const move = (row: number, nextField: keyof PurchaseInvoiceItem): void => { focusCell(tableRef, row, nextField); };

        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
            event.preventDefault();
            move(Math.max(0, Math.min(itemCount - 1, rowIndex + (event.key === 'ArrowUp' ? -1 : 1))), field);
            return;
        }
        if (event.key === 'Enter') {
            event.preventDefault();
            if (rowIndex === itemCount - 1 && field === 'costPrice') {
                addItem();
                window.setTimeout(() => { move(rowIndex + 1, 'name'); }, 50);
            } else move(rowIndex + 1, field);
            return;
        }
        if (event.key !== 'Tab') return;
        event.preventDefault();
        const nextColumn = event.shiftKey ? columnIndex - 1 : columnIndex + 1;
        if (nextColumn >= 0 && nextColumn < fieldsOrder.length) move(rowIndex, fieldsOrder[nextColumn]);
        else if (!event.shiftKey && rowIndex === itemCount - 1) {
            addItem();
            window.setTimeout(() => { move(rowIndex + 1, fieldsOrder[0]); }, 50);
        } else if (!event.shiftKey) move(rowIndex + 1, fieldsOrder[0]);
        else if (rowIndex > 0) move(rowIndex - 1, fieldsOrder[fieldsOrder.length - 1]);
    }, [addItem, handleOpenSearch, itemCount, showDiscount, tableRef]);

    return { modalState, setModalState, handleOpenSearch, handleProductSelect, handleKeyDown };
};
