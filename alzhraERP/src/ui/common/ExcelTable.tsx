import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '../../core/utils';
import { useTableKeyboardNavigation } from './useTableKeyboardNavigation';
import { useTableDragDrop } from './hooks/useTableDragDrop';
import { useTableSelection } from './hooks/useTableSelection';
import { useColumnResize } from './hooks/useColumnResize';
import { ExcelTableHeader } from './ExcelTableHeader';
import { ExcelTableBody } from './ExcelTableBody';
import { ExcelTablePagination } from './ExcelTablePagination';
import FullscreenContainer from '../base/FullscreenContainer';
import ExcelTableToolbar from './ExcelTableToolbar';
import { EXCEL_TABLE_THEMES, ExcelTableColorTheme } from './excelTableThemes';

export interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  accessorKey?: keyof T | string;
  sortKey?: keyof T | string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  isEditable?: boolean;
  footer?: (data: T[]) => React.ReactNode;
}

interface ExcelTableProps<T> {
  columns: Column<T>[];
  data: T[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  colorTheme?: ExcelTableColorTheme;
  onExport?: (() => void) | undefined;
  showSearch?: boolean;
  /** External search value for a "main" search box (bypasses internal client-side filtering). */
  searchValue?: string;
  /** Callback when the toolbar search input changes. If provided, internal search is disabled. */
  onSearchChange?: ((value: string) => void) | undefined;
  onRowClick?: ((row: T) => void) | undefined;
  onRowDoubleClick?: ((row: T) => void) | undefined;
  onOrderChange?: ((reorderedData: T[]) => void) | undefined;
  onCellUpdate?: ((rowIndex: number, accessorKey: string, value: unknown) => void | Promise<void>) | undefined;
  enablePagination?: boolean;
  pageSize?: number;
  enableSelection?: boolean;
  selectedRowIds?: Set<string>;
  onSelectionChange?: ((selectedIds: Set<string>) => void) | undefined;
  getRowId?: ((row: T) => string) | undefined;
  isRTL?: boolean;
  enableResize?: boolean;
  enableDrag?: boolean;
  /** مفتاح تخصيص حفظ عروض الأعمدة في localStorage (افتراضياً يُشتق من title) */
  resizeStorageKey?: string;
  isLoading?: boolean;
}

function ExcelTable<T>({
  columns, data, title, emptyMessage, colorTheme = 'blue',
  onExport, showSearch = true, searchValue, onSearchChange, onRowClick, onRowDoubleClick, onOrderChange,
  onCellUpdate, enablePagination = true, pageSize = 20,
  enableSelection = false, selectedRowIds = new Set(), onSelectionChange, getRowId,
  isRTL = false, enableResize = true, enableDrag = false,
  resizeStorageKey, isLoading = false
}: ExcelTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [internalSearch, setInternalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const isMainSearch = !!onSearchChange;
  const effectiveSearch = isMainSearch ? (searchValue ?? '') : internalSearch;
  const [isZoomed, setIsZoomed] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Resize state
  const [_isResizing, _setIsResizing] = useState(false);
  const [_resizeDirection, _setResizeDirection] = useState<string | null>(null);
  const [customSize, setCustomSize] = useState<{ width?: string; height?: string }>({});
  const [originalSize, setOriginalSize] = useState<{ width?: string; height?: string }>({});

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(pageSize);

  useEffect(() => {
    setItemsPerPage(pageSize);
  }, [pageSize]);

  // Debounce internal search for smoother typing
  useEffect(() => {
    if (isMainSearch) return;
    const timer = setTimeout(() => {
      setDebouncedSearch(internalSearch);
    }, 150);
    return () => clearTimeout(timer);
  }, [internalSearch, isMainSearch]);

  const searchTermForFilter = isMainSearch ? (searchValue ?? '') : debouncedSearch;

  const currentTheme = EXCEL_TABLE_THEMES[colorTheme];
  const [zoomLevel, setZoomLevel] = useState(1);

  // ── Column Resize (موحّدة + محفوظة + ناعمة) ──────────────────────
  const tableResizeStorageKey = resizeStorageKey ?? (title ? `excel-table-cols:${title.trim()}` : undefined);
  const defaultColWidths = useMemo(() => {
    const out: Record<string, number> = {};
    columns.forEach((col, idx) => {
      if (col.width) {
        const parsed = parseInt(col.width, 10);
        if (!Number.isNaN(parsed)) out[String(idx)] = parsed;
      }
    });
    return out;
  }, [columns]);
  const { colWidths, isResizing: isColumnResizing, onResizeMouseDown, resetWidths } = useColumnResize({
    ...(tableResizeStorageKey ? { storageKey: tableResizeStorageKey } : {}),
    defaultWidths: defaultColWidths,
    minWidth: 40,
    isRTL,
  });

  const processedData = useMemo(() => {
    let items = [...data];
    if (!isMainSearch && searchTermForFilter) {
      const term = searchTermForFilter.toLowerCase();

      // Helper to recursively extract text from any React element or primitive
      const getStringContent = (val: unknown): string => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
          return String(val);
        }
        if (Array.isArray(val)) {
          return val.map(getStringContent).join(' ');
        }
        if (typeof val === 'object') {
          const obj = val as { props?: { children?: unknown }; $$typeof?: unknown; then?: unknown };
          if (obj.props && obj.props.children !== undefined) {
            return getStringContent(obj.props.children);
          }
          if (!obj.$$typeof && typeof obj.then !== 'function') {
            try {
              return Object.values(obj as Record<string, unknown>).map(getStringContent).join(' ');
            } catch (e) {
              return '';
            }
          }
        }
        return '';
      };

      items = items.filter(item => {
        // 1. Try to evaluate column accessors to catch custom displayed values/elements
        const accessorMatches = columns.some(col => {
          try {
            const val = col.accessor(item);
            const content = getStringContent(val);
            if (content) {
              return content.toLowerCase().includes(term);
            }
          } catch (e) {
            // Ignore errors in custom accessors
          }
          return false;
        });
        if (accessorMatches) return true;

        // 2. Fallback to recursive deep search of the item object's values
        const deepSearch = (val: unknown): boolean => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
            return String(val).toLowerCase().includes(term);
          }
          if (typeof val === 'object') {
            const obj = val as { $$typeof?: unknown; then?: unknown };
            if (obj.$$typeof || typeof obj.then === 'function') return false;
            try {
              return Object.values(obj as Record<string, unknown>).some(deepSearch);
            } catch (e) {
              return false;
            }
          }
          return false;
        };
        return deepSearch(item);
      });
    }
    if (sortConfig) {
      items.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[sortConfig.key];
        const bVal = (b as Record<string, unknown>)[sortConfig.key];

        // Handle undefined/null cases
        if (aVal === bVal) return 0;
        if (aVal === undefined || aVal === null) return sortConfig.direction === 'asc' ? 1 : -1;
        if (bVal === undefined || bVal === null) return sortConfig.direction === 'asc' ? -1 : 1;

        return sortConfig.direction === 'asc'
          ? (aVal > bVal ? 1 : -1)
          : (aVal < bVal ? 1 : -1);
      });
    }
    return items;
  }, [data, sortConfig, searchTermForFilter, columns, isMainSearch]);

  // Reset page when search/data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTermForFilter, data.length]);

  const paginatedData = useMemo(() => {
    if (!enablePagination) return processedData;
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedData.slice(startIndex, startIndex + itemsPerPage);
  }, [processedData, currentPage, itemsPerPage, enablePagination]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  // Custom Hooks
  const { orderedData, handlers: { handleDragStart, handleDragEnter, handleDragOver, handleDragEnd, handleDrop } } = useTableDragDrop(paginatedData, onOrderChange, tableRef);
  const { toggleAllSelection, toggleRowSelection } = useTableSelection(orderedData, selectedRowIds, onSelectionChange, getRowId);

  const {
    focusedCell,
    setFocusedCell,
    editingCell,
    setEditingCell,
    editValue,
    setEditValue,
    startEditing,
    saveEdit,
    selection,
    copyCells: _copyCells,
    copySelection: _copySelection,
    pasteCells: _pasteCells,
    handleCellClick,
    startSelection,
    updateSelection: _updateSelection,
    endSelection,
    pageSizeRef,
    moveFocus: _moveFocus
  } = useTableKeyboardNavigation({
    tableRef: tableRef as React.RefObject<HTMLDivElement>,
    orderedData,
    columns,
    isRTL,
    onRowDoubleClick,
    onCellUpdate
  });

  // Update page size ref
  useEffect(() => {
    pageSizeRef.current = itemsPerPage;
  }, [itemsPerPage]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig?.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  // Reset size to original
  const handleResetSize = () => {
    setCustomSize({});
    setIsZoomed(false);
    setPosition({ x: 0, y: 0 });
    resetWidths();
  };

  // Save original size before resize
  const saveOriginalSize = useCallback(() => {
    if (tableWrapperRef.current && Object.keys(originalSize).length === 0) {
      setOriginalSize({
        width: tableWrapperRef.current.style.width || '',
        height: tableWrapperRef.current.style.height || ''
      });
    }
  }, [originalSize]);

  // Handle wrapper resize start (for full table resize)
  const handleWrapperResizeStart = (direction: string, e: React.MouseEvent) => {
    if (!enableResize) return;
    e.stopPropagation();
    _setIsResizing(true);
    _setResizeDirection(direction);
    saveOriginalSize();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = tableWrapperRef.current?.offsetWidth || 0;
    const startHeight = tableWrapperRef.current?.offsetHeight || 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!tableWrapperRef.current) return;

      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let newWidth = startWidth;
      let newHeight = startHeight;

      if (direction.includes('e')) {
        newWidth = Math.max(400, startWidth + deltaX);
      }
      if (direction.includes('w')) {
        newWidth = Math.max(400, startWidth - deltaX);
      }
      if (direction.includes('s')) {
        newHeight = Math.max(200, startHeight + deltaY);
      }
      if (direction.includes('n')) {
        newHeight = Math.max(200, startHeight - deltaY);
      }

      setCustomSize({ width: `${newWidth}px`, height: `${newHeight}px` });
    };

    const handleMouseUp = () => {
      _setIsResizing(false);
      _setResizeDirection(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = `${direction}-resize`;
    document.body.style.userSelect = 'none';
  };

  // Handle drag start
  const handleTableDragStart = (e: React.MouseEvent) => {
    if (!enableDrag || isZoomed) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    const rect = tableWrapperRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newX = moveEvent.clientX - dragOffset.x;
      const newY = moveEvent.clientY - dragOffset.y;
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
  };

  const handleEditInputKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await saveEdit();
      if (editingCell) {
        const nextRow = Math.min(orderedData.length - 1, editingCell.row + 1);
        setFocusedCell({ row: nextRow, col: editingCell.col });
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
    } else if (e.key === 'Tab') {
      e.preventDefault();
      await saveEdit();
      if (editingCell) {
        const nextCol = e.shiftKey
          ? Math.max(0, editingCell.col - 1)
          : Math.min(columns.length - 1, editingCell.col + 1);
        const nextRow = nextCol !== editingCell.col
          ? editingCell.row
          : (e.shiftKey ? Math.max(0, editingCell.row - 1) : Math.min(orderedData.length - 1, editingCell.row + 1));
        setFocusedCell({ row: nextRow, col: nextCol });
      }
    }
  };

  // Handle mouse selection
  const handleMouseDownCell = (e: React.MouseEvent, rowIdx: number, colIdx: number) => {
    if (e.shiftKey) {
      handleCellClick(rowIdx, colIdx, true);
    } else {
      startSelection(rowIdx, colIdx);
    }
  };

  const handleMouseEnterCell = () => {
    if (isMouseDown) {
      // Selection is being made - handled by startSelection/updateSelection
    }
  };



  return (
    <FullscreenContainer isMaximized={isZoomed} onToggleMaximize={() => setIsZoomed(false)}>
      <div className={cn(
        "w-full flex-1 min-h-0 flex flex-col transition-all duration-300 relative",
        isZoomed ? "h-full bg-[var(--app-surface)] p-4" : "h-full min-h-[420px]"
      )}>
        <ExcelTableToolbar
          title={title}
          currentTheme={currentTheme}
          showSearch={showSearch}
          internalSearch={effectiveSearch}
          setInternalSearch={isMainSearch ? onSearchChange! : setInternalSearch}
          isRTL={isRTL}
          onExport={onExport}
          enableResize={enableResize}
          handleResetSize={handleResetSize}
          isZoomed={isZoomed}
          setIsZoomed={setIsZoomed}
          zoomLevel={zoomLevel}
          setZoomLevel={setZoomLevel}
        />

        {/* Table Wrapper with Resize Handles */}
        <div
          ref={tableWrapperRef}
          className="flex-1 min-h-0 border border-[var(--app-border)] shadow-sm bg-[var(--app-surface)] overflow-hidden rounded-xl relative flex flex-col"
          style={{
            ...(customSize.width ? { width: customSize.width } : {}),
            ...(customSize.height ? { maxHeight: customSize.height } : {}),
            ...(position.x !== 0 || position.y !== 0 ? { transform: `translate(${position.x}px, ${position.y}px)` } : {}),
            ...(isDragging ? { cursor: 'grabbing', opacity: 0.9 } : {})
          }}
          onMouseDown={handleTableDragStart}
        >
          {/* Resize Handles */}
          {enableResize && !isZoomed && (
            <>
              {/* Top */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5 cursor-n-resize hover:bg-blue-500/30 transition-colors z-10"
                onMouseDown={(e) => handleWrapperResizeStart('n', e)}
              />
              {/* Bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 h-1.5 cursor-s-resize hover:bg-blue-500/30 transition-colors z-10"
                onMouseDown={(e) => handleWrapperResizeStart('s', e)}
              />
              {/* Left */}
              <div
                className="absolute top-0 bottom-0 left-0 w-1.5 cursor-w-resize hover:bg-blue-500/30 transition-colors z-10"
                onMouseDown={(e) => handleWrapperResizeStart('w', e)}
              />
              {/* Right */}
              <div
                className="absolute top-0 bottom-0 right-0 w-1.5 cursor-e-resize hover:bg-blue-500/30 transition-colors z-10"
                onMouseDown={(e) => handleWrapperResizeStart('e', e)}
              />
              {/* Corners */}
              <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize hover:bg-blue-500/30 transition-colors z-10" onMouseDown={(e) => handleWrapperResizeStart('nw', e)} />
              <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize hover:bg-blue-500/30 transition-colors z-10" onMouseDown={(e) => handleWrapperResizeStart('ne', e)} />
              <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize hover:bg-blue-500/30 transition-colors z-10" onMouseDown={(e) => handleWrapperResizeStart('sw', e)} />
              <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize hover:bg-blue-500/30 transition-colors z-10" onMouseDown={(e) => handleWrapperResizeStart('se', e)} />
            </>
          )}
          {/* Drag Handle in Title */}
          {enableDrag && !isZoomed && (
            <div className="absolute top-2 left-2 z-20 cursor-grab active:cursor-grabbing text-[var(--app-text-secondary)] hover:text-blue-500">
              <GripVertical size={14} />
            </div>
          )}
          <div
            ref={tableRef}
            tabIndex={0}
            className="flex-1 min-h-0 overflow-auto custom-scrollbar scroll-x-hint-surface outline-none overscroll-contain"
            onMouseDown={() => setIsMouseDown(true)}
            onMouseUp={() => { setIsMouseDown(false); endSelection(); }}
            onMouseLeave={() => { setIsMouseDown(false); endSelection(); }}
          >
            <table
              role="table"
              aria-label={title || 'جدول البيانات'}
              style={{ fontSize: `${zoomLevel * 11}px` }}
              className={cn(
                "w-full border-collapse table-auto max-md:min-w-0 min-w-[800px] border-l border-t border-[var(--app-border)]",
                isRTL ? "text-right" : "text-left"
              )}
            >
              <colgroup>
                {enableSelection && <col style={{ width: 40 }} />}
                <col style={{ width: 40 }} />
                {columns.map((col, idx) => {
                  const savedWidth = colWidths[String(idx)];
                  const colStyle = savedWidth
                    ? { width: `${savedWidth}px` }
                    : (col.width ? { width: col.width } : {});
                  return (
                    <col
                      key={idx}
                      style={colStyle}
                      className={isColumnResizing ? 'will-change-[width]' : undefined}
                    />
                  );
                })}
              </colgroup>
              <ExcelTableHeader
                columns={columns}
                enableSelection={enableSelection}
                orderedDataLength={orderedData.length}
                selectedRowIdsSize={selectedRowIds.size}
                toggleAllSelection={toggleAllSelection}
                columnWidths={colWidths}
                handleSort={handleSort}
                sortConfig={sortConfig}
                isRTL={isRTL}
                handleMouseDown={(e, idx) => onResizeMouseDown(e, String(idx))}
                isLoading={isLoading}
              />
              <ExcelTableBody
                isLoading={isLoading}
                orderedData={orderedData}
                columns={columns}
                enableSelection={enableSelection}
                emptyMessage={emptyMessage}
                selectedRowIds={selectedRowIds}
                selection={selection}
                getRowId={getRowId}
                handleDragStart={handleDragStart}
                handleDragEnter={handleDragEnter}
                handleDragOver={handleDragOver}
                handleDragEnd={handleDragEnd}
                handleDrop={handleDrop}
                onRowClick={onRowClick}
                onOrderChange={onOrderChange}
                currentTheme={currentTheme}
                toggleRowSelection={toggleRowSelection}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                focusedCell={focusedCell}
                editingCell={editingCell}
                handleCellClick={handleCellClick}
                handleMouseDownCell={handleMouseDownCell}
                handleMouseEnterCell={handleMouseEnterCell}
                onRowDoubleClick={onRowDoubleClick as ((row: T) => void) | undefined}
                startEditing={startEditing}
                editValue={editValue}
                setEditValue={setEditValue}
                saveEdit={saveEdit}
                handleEditInputKeyDown={handleEditInputKeyDown}
                isRTL={isRTL}
                scrollRef={tableRef as React.RefObject<HTMLDivElement>}
              />
              {columns.some(c => c.footer) && (
                <tfoot className="border-t-2 border-[var(--app-border)] bg-[var(--app-bg)]">
                  <tr>
                    <td className="p-2 border-r border-[var(--app-border)]"></td>
                    {columns.map((col, idx) => (
                      <td key={idx} className={cn("p-2 text-[11px] font-bold border-r border-[var(--app-border)]", col.className)}>
                        {col.footer ? col.footer(orderedData) : ''}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Footer */}
          <ExcelTablePagination
            enablePagination={enablePagination}
            totalPages={totalPages}
            processedDataLength={processedData.length}
            itemsPerPage={itemsPerPage}
            setItemsPerPage={setItemsPerPage}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            isRTL={isRTL}
            currentTheme={currentTheme}
          />
        </div>
      </div>
    </FullscreenContainer>
  );
}

export default ExcelTable;
