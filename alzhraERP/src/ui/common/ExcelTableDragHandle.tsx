import React from 'react';
import { GripVertical } from 'lucide-react';

interface ExcelTableDragHandleProps {
    enableDrag: boolean;
    isZoomed: boolean;
}

const ExcelTableDragHandle: React.FC<ExcelTableDragHandleProps> = React.memo(({
    enableDrag,
    isZoomed
}) => {
    if (!enableDrag || isZoomed) return null;

    return (
        <div className="absolute top-2 left-2 z-20 cursor-grab active:cursor-grabbing text-[var(--app-text-secondary)] hover:text-blue-500">
            <GripVertical size={14} />
        </div>
    );
});

ExcelTableDragHandle.displayName = 'ExcelTableDragHandle';

export default ExcelTableDragHandle;
