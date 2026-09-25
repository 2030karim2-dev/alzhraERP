import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  normalizeArabicDigits,
  parseNumberFlexible,
  convertCurrency,
} from '../../../../core/utils';
import { useSalesStore } from '../../../sales/store';

export interface PriceCellInputProps {
  productId: string;
  price: number;
  rowIndex: number;
  onFocus: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

interface PriceCellLogic {
  localVal: string;
  setLocalVal: React.Dispatch<React.SetStateAction<string>>;
  isFocusedRef: React.RefObject<boolean>;
  commitPrice: (val: string) => void;
}

function usePriceCellLogic(productId: string, price: number): PriceCellLogic {
  const { items, updateItem, currency, exchangeRate, exchangeOperator } = useSalesStore();
  const [localVal, setLocalVal] = useState<string>(
    price !== 0 && !isNaN(price) ? String(price) : ''
  );
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalVal(price !== 0 && !isNaN(price) ? String(price) : '');
    }
  }, [price]);

  const commitPrice = useCallback(
    (val: string): void => {
      const num = parseNumberFlexible(val);
      if (!isNaN(num) && num >= 0) {
        const idx = items.findIndex(i => i.productId === productId);
        if (idx !== -1) {
          let basePrice = num;
          if (currency !== 'SAR') {
            try {
              basePrice = convertCurrency(num, exchangeRate, 'toBase', exchangeOperator);
            } catch {
              return;
            }
          }
          updateItem(idx, 'price', num);
          updateItem(idx, 'basePrice', basePrice);
        }
      } else {
        setLocalVal(price !== 0 && !isNaN(price) ? String(price) : '');
      }
    },
    [currency, exchangeOperator, exchangeRate, items, productId, updateItem, price]
  );

  return { localVal, setLocalVal, isFocusedRef, commitPrice };
}

export const PriceCellInput: React.FC<PriceCellInputProps> = React.memo(
  ({ productId, price, rowIndex, onFocus, onKeyDown }) => {
    const { localVal, setLocalVal, isFocusedRef, commitPrice } = usePriceCellLogic(
      productId,
      price
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      let raw = normalizeArabicDigits(e.target.value).replace(/[،٫]/g, '.');
      if (raw.includes(',') && !raw.includes('.')) raw = raw.replace(',', '.');
      if (raw === '' || raw === '.' || /^\d*\.?\d*$/.test(raw)) {
        setLocalVal(raw);
      }
    };

    const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement>): void => {
      if (e.key === 'Enter') {
        commitPrice(localVal);
      }
      onKeyDown(e);
    };

    return (
      <input
        type="text"
        inputMode="decimal"
        value={localVal}
        onFocus={e => {
          isFocusedRef.current = true;
          onFocus();
          e.target.select();
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          commitPrice(localVal);
        }}
        onChange={handleChange}
        onKeyDown={handleKeyDownInternal}
        data-row-index={rowIndex}
        data-col-field="price"
        className="h-full w-full bg-transparent px-1 py-0.5 text-left font-mono text-[11px] font-bold text-slate-800 outline-none transition-colors hover:bg-slate-100/60 focus:bg-blue-50/80 focus:text-blue-700 dark:text-slate-100 dark:hover:bg-slate-800/60 dark:focus:bg-blue-950/40 dark:focus:text-blue-300"
        placeholder="0.00"
        dir="ltr"
      />
    );
  }
);

PriceCellInput.displayName = 'PriceCellInput';
