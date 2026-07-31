import { useState, useEffect, useCallback } from 'react';

export type FontSize = 'small' | 'medium' | 'large';

export interface ColumnConfig {
    id: string;
    label: string;
    visible: boolean;
    width: number;
    order: number;
}

interface TableConfig {
    columns: ColumnConfig[];
    fontSize: FontSize;
}

const DEFAULT_CONFIG: TableConfig = {
    columns: [
        { id: 'index', label: 'ت', visible: true, width: 40, order: 0 },
        { id: 'name', label: 'اسم المنتج', visible: true, width: 260, order: 1 },
        { id: 'part_number', label: 'رقم القطعة (OEM)', visible: true, width: 150, order: 2 },
        { id: 'brand', label: 'الشركة', visible: true, width: 100, order: 3 },
        { id: 'branch', label: 'الفرع', visible: true, width: 110, order: 4 },
        { id: 'stock', label: 'الكمية', visible: true, width: 70, order: 5 },
        { id: 'price', label: 'السعر', visible: true, width: 90, order: 6 },
        { id: 'size', label: 'المقاس', visible: true, width: 80, order: 7 },
        { id: 'specs', label: 'المواصفات', visible: false, width: 150, order: 8 },
        { id: 'actions', label: 'الإجراءات', visible: true, width: 70, order: 9 },
    ],
    fontSize: 'medium'
};

const STORAGE_KEY = 'productSearchTableConfig_v2'; // v2: removed SKU column, added part_number

// Extracted to avoid max-lines-per-function
const loadInitialConfig = (): TableConfig => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved !== null && saved !== '') {
            const parsed = JSON.parse(saved) as TableConfig;
            
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
            const parsedCols = parsed.columns ?? [];
            
            // Merge with default to handle newly added columns
            const mergedColumns = DEFAULT_CONFIG.columns.map(defCol => {
                const savedCol = parsedCols.find((c) => c.id === defCol.id);
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                const order = savedCol?.order !== undefined ? savedCol.order : defCol.order;
                return savedCol ? { ...defCol, ...savedCol, order } : defCol;
            }).sort((a, b) => a.order - b.order);
            
            // Fix order conflicts if new columns were added
            const normalizedColumns = mergedColumns.map((col, index) => ({ ...col, order: index }));

            return {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                fontSize: parsed.fontSize ?? DEFAULT_CONFIG.fontSize,
                columns: normalizedColumns
            };
        }
    } catch (e) {
        console.error('Failed to load table config', e);
    }
    return DEFAULT_CONFIG;
};

interface UseProductTableConfigReturn {
    config: TableConfig;
    setColumnWidth: (id: string, width: number) => void;
    toggleColumnVisibility: (id: string) => void;
    reorderColumn: (dragIndex: number, hoverIndex: number) => void;
    setFontSize: (size: FontSize) => void;
    resetConfig: () => void;
}

export const useProductTableConfig = (): UseProductTableConfigReturn => {
    const [config, setConfig] = useState<TableConfig>(loadInitialConfig);

    // Save to localStorage whenever config changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }, [config]);

    const setColumnWidth = useCallback((id: string, width: number): void => {
        setConfig(prev => ({
            ...prev,
            columns: prev.columns.map(col => col.id === id ? { ...col, width } : col)
        }));
    }, []);

    const toggleColumnVisibility = useCallback((id: string): void => {
        setConfig(prev => ({
            ...prev,
            columns: prev.columns.map(col => col.id === id ? { ...col, visible: !col.visible } : col)
        }));
    }, []);

    const reorderColumn = useCallback((dragIndex: number, hoverIndex: number): void => {
        setConfig(prev => {
            const newCols = [...prev.columns];
            // eslint-disable-next-line security/detect-object-injection
            const dragCol = newCols[dragIndex];
            
            if (dragCol !== undefined) {
                newCols.splice(dragIndex, 1);
                newCols.splice(hoverIndex, 0, dragCol);
            }
            
            // Update order values
            const reorderedCols = newCols.map((col, index) => ({ ...col, order: index }));
            return { ...prev, columns: reorderedCols };
        });
    }, []);

    const setFontSize = useCallback((size: FontSize): void => {
        setConfig(prev => ({ ...prev, fontSize: size }));
    }, []);

    const resetConfig = useCallback((): void => {
        setConfig(DEFAULT_CONFIG);
    }, []);

    return {
        config,
        setColumnWidth,
        toggleColumnVisibility,
        reorderColumn,
        setFontSize,
        resetConfig
    };
};
