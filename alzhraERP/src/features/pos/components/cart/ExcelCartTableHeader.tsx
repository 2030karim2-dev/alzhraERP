import React from 'react';

interface ExcelCartTableHeaderProps {
  onResizeMouseDown: (e: React.MouseEvent, columnKey: string) => void;
}

const ResizeHandle: React.FC<{
  columnKey: string;
  onResizeMouseDown: (e: React.MouseEvent, columnKey: string) => void;
}> = ({ columnKey, onResizeMouseDown }) => (
  <button
    type="button"
    aria-label="تغيير عرض العمود"
    onMouseDown={e => {
      onResizeMouseDown(e, columnKey);
    }}
    className="absolute bottom-0 left-0 top-0 z-30 w-1.5 cursor-col-resize border-none bg-transparent p-0 transition-colors hover:bg-blue-500 active:bg-blue-600"
    title="اسحب لتغيير العرض"
  />
);

const HeaderCell: React.FC<{
  title: string;
  columnKey: string;
  align?: 'right' | 'center' | 'left';
  onResizeMouseDown: (e: React.MouseEvent, columnKey: string) => void;
}> = ({ title, columnKey, align = 'right', onResizeMouseDown }) => {
  const alignClass =
    align === 'center' ? 'text-center' : align === 'left' ? 'text-left' : 'text-right';
  return (
    <th
      className={`relative select-none border-l border-slate-300 px-1 py-1.5 ${alignClass} dark:border-slate-700`}
    >
      <span className="truncate">{title}</span>
      <ResizeHandle columnKey={columnKey} onResizeMouseDown={onResizeMouseDown} />
    </th>
  );
};

export const ExcelCartTableHeader: React.FC<ExcelCartTableHeaderProps> = React.memo(
  ({ onResizeMouseDown }) => (
    <thead className="sticky top-0 z-20 border-b border-slate-300 bg-slate-100 shadow-xs dark:border-slate-700 dark:bg-slate-800">
      <tr className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
        <th className="select-none border-l border-slate-300 bg-slate-200/70 py-1.5 text-center dark:border-slate-700 dark:bg-slate-850">
          #
        </th>
        <HeaderCell title="الصنف" columnKey="name" onResizeMouseDown={onResizeMouseDown} />
        <HeaderCell
          title="رقم القطعة"
          columnKey="partNumber"
          onResizeMouseDown={onResizeMouseDown}
        />
        <HeaderCell
          title="الكمية"
          columnKey="quantity"
          align="center"
          onResizeMouseDown={onResizeMouseDown}
        />
        <HeaderCell
          title="السعر"
          columnKey="price"
          align="left"
          onResizeMouseDown={onResizeMouseDown}
        />
        <HeaderCell
          title="الإجمالي"
          columnKey="total"
          align="left"
          onResizeMouseDown={onResizeMouseDown}
        />
        <th className="py-1.5 text-center">✕</th>
      </tr>
    </thead>
  )
);

ExcelCartTableHeader.displayName = 'ExcelCartTableHeader';
