/* eslint-disable max-lines-per-function, complexity, security/detect-object-injection, @typescript-eslint/explicit-function-return-type */
import { useCallback, useState } from 'react';
import type React from 'react';
import type { PurchaseInvoiceItem } from '../../store';
import type { Product } from '../../../inventory/types';

interface ModalState {
  isOpen: boolean;
  rowIndex: number;
  query: string;
}
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

export type PurchaseNavigationField = keyof PurchaseInvoiceItem | 'total';

const focusCell = (tableRef: TableRef, row: number, field: PurchaseNavigationField): void => {
  const selector = `[data-row-index="${row.toString()}"][data-col-field="${field}"]`;
  const cell = tableRef.current?.querySelector<HTMLInputElement>(selector);
  cell?.focus();
  cell?.select();
};

export const usePurchaseTableKeyboard = ({
  tableRef,
  itemCount,
  showDiscount,
  setProductForRow,
  addItem,
}: UsePurchaseTableKeyboardArgs) => {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    rowIndex: 0,
    query: '',
  });

  const handleOpenSearch = useCallback((index: number, query = ''): void => {
    setModalState({ isOpen: true, rowIndex: index, query });
  }, []);

  const handleProductSelect = useCallback(
    (product: Product): void => {
      const rowIndex = modalState.rowIndex;
      setProductForRow(rowIndex, product);
      setModalState(current => ({ ...current, isOpen: false }));
      window.setTimeout(() => {
        focusCell(tableRef, rowIndex, 'quantity');
      }, 50);
    },
    [modalState.rowIndex, setProductForRow, tableRef]
  );

  const handleKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLInputElement>,
      rowIndex: number,
      field: PurchaseNavigationField
    ): void => {
      if (
        field === 'name' &&
        (event.key === 'Enter' || (event.key.length === 1 && !event.ctrlKey && !event.metaKey))
      ) {
        event.preventDefault();
        handleOpenSearch(rowIndex, event.key.length === 1 ? event.key : '');
        return;
      }

      const fieldsOrder: PurchaseNavigationField[] = ['name', 'quantity', 'costPrice'];
      if (showDiscount) fieldsOrder.push('discount');
      fieldsOrder.push('total');
      const columnIndex = fieldsOrder.indexOf(field);
      const move = (row: number, nextField: PurchaseNavigationField): void => {
        focusCell(tableRef, row, nextField);
      };

      const target = event.target as HTMLInputElement;
      const isReadOnly = target.readOnly;
      const hasFullSelection =
        target.selectionStart === 0 && target.selectionEnd === target.value.length;
      const isAtStart = target.selectionStart === 0 && target.selectionEnd === 0;
      const isAtEnd =
        target.selectionStart === target.value.length &&
        target.selectionEnd === target.value.length;
      const isEmpty = target.value.trim() === '';

      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault();
          move(Math.max(0, rowIndex - 1), field);
          break;

        case 'ArrowDown':
          event.preventDefault();
          if (rowIndex === itemCount - 1) {
            addItem();
            window.setTimeout(() => {
              move(rowIndex + 1, 'name');
            }, 60);
          } else {
            move(rowIndex + 1, field);
          }
          break;

        case 'ArrowLeft':
          // In RTL layout, moving Left is forward: name -> quantity -> costPrice -> (discount) -> total
          if (
            isReadOnly ||
            hasFullSelection ||
            isAtEnd ||
            isEmpty ||
            event.ctrlKey ||
            event.altKey
          ) {
            event.preventDefault();
            if (columnIndex < fieldsOrder.length - 1) {
              move(rowIndex, fieldsOrder[columnIndex + 1]);
            } else if (rowIndex === itemCount - 1) {
              addItem();
              window.setTimeout(() => {
                move(rowIndex + 1, 'name');
              }, 60);
            } else {
              move(rowIndex + 1, fieldsOrder[0]);
            }
          }
          break;

        case 'ArrowRight':
          // In RTL layout, moving Right is backward: total -> (discount) -> costPrice -> quantity -> name
          if (
            isReadOnly ||
            hasFullSelection ||
            isAtStart ||
            isEmpty ||
            event.ctrlKey ||
            event.altKey
          ) {
            event.preventDefault();
            if (columnIndex > 0) {
              move(rowIndex, fieldsOrder[columnIndex - 1]);
            } else if (rowIndex > 0) {
              move(rowIndex - 1, fieldsOrder[fieldsOrder.length - 1]);
            }
          }
          break;

        case 'Enter':
          event.preventDefault();
          if (columnIndex < fieldsOrder.length - 1) {
            move(rowIndex, fieldsOrder[columnIndex + 1]);
          } else if (rowIndex === itemCount - 1) {
            addItem();
            window.setTimeout(() => {
              move(rowIndex + 1, 'name');
            }, 60);
          } else {
            move(rowIndex + 1, fieldsOrder[0]);
          }
          break;

        case 'Tab':
          event.preventDefault();
          const nextColumn = event.shiftKey ? columnIndex - 1 : columnIndex + 1;
          if (nextColumn >= 0 && nextColumn < fieldsOrder.length) {
            move(rowIndex, fieldsOrder[nextColumn]);
          } else if (!event.shiftKey && rowIndex === itemCount - 1) {
            addItem();
            window.setTimeout(() => {
              move(rowIndex + 1, fieldsOrder[0]);
            }, 60);
          } else if (!event.shiftKey) {
            move(rowIndex + 1, fieldsOrder[0]);
          } else if (rowIndex > 0) {
            move(rowIndex - 1, fieldsOrder[fieldsOrder.length - 1]);
          }
          break;

        default:
          return;
      }
    },
    [addItem, handleOpenSearch, itemCount, showDiscount, tableRef]
  );

  return { modalState, setModalState, handleOpenSearch, handleProductSelect, handleKeyDown };
};
