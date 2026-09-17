import React from 'react';
import { GripVertical } from 'lucide-react';

interface ExcelTableDragHandleProps {
  enableDrag: boolean;
  isZoomed: boolean;
}

const ExcelTableDragHandle: React.FC<ExcelTableDragHandleProps> = React.memo(
  ({ enableDrag, isZoomed }) => {
    if (!enableDrag || isZoomed) return null;

    return (
      <div className="absolute left-2 top-2 z-20 cursor-grab text-[var(--app-text-secondary)] hover:text-blue-500 active:cursor-grabbing">
        <GripVertical size={14} />
      </div>
    );
  }
);

ExcelTableDragHandle.displayName = 'ExcelTableDragHandle';

export default ExcelTableDragHandle;
