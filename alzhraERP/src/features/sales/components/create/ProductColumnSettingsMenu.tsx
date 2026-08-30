import React from 'react';
import { Settings, Eye, EyeOff, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import type { TableConfig } from '../../hooks/useProductTableConfig';

interface ProductColumnSettingsMenuProps {
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  settingsRef: React.RefObject<HTMLDivElement | null>;
  config: TableConfig;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
  toggleColumnVisibility: (columnId: string) => void;
  reorderColumn: (startIndex: number, endIndex: number) => void;
  resetConfig: () => void;
}

export const ProductColumnSettingsMenu: React.FC<ProductColumnSettingsMenuProps> = ({
  showSettings,
  setShowSettings,
  settingsRef,
  config,
  setFontSize,
  toggleColumnVisibility,
  reorderColumn,
  resetConfig,
}) => {
  const moveColumnUp = (index: number) => {
    if (index > 0) reorderColumn(index, index - 1);
  };

  const moveColumnDown = (index: number) => {
    if (index < config.columns.length - 1) reorderColumn(index, index + 1);
  };

  return (
    <div className="relative" ref={settingsRef}>
      <button
        type="button"
        onClick={() => setShowSettings(!showSettings)}
        className={`rounded-lg border p-2 transition-colors max-md:p-2 ${
          showSettings
            ? 'border-blue-400 bg-blue-100 text-blue-700 dark:border-blue-500 dark:bg-blue-900/40'
            : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800'
        }`}
        title="إعدادات الجدول"
      >
        <Settings size={16} />
      </button>

      {showSettings && (
        <div
          className="absolute left-0 top-full z-[200] mt-2 w-72 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-800 max-md:p-4"
          onClick={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between border-b pb-2 dark:border-slate-700">
            <h3 className="text-sm font-bold">إعدادات الجدول</h3>
            <button
              type="button"
              onMouseDown={e => e.stopPropagation()}
              onClick={() => resetConfig()}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20 max-md:gap-1"
            >
              <RotateCcw size={10} /> استعادة الافتراضي
            </button>
          </div>

          {/* Font Size */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-bold text-gray-500">حجم الخط</label>
            <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-slate-900 max-md:gap-1 max-md:p-1">
              {(['small', 'medium', 'large'] as const).map(sz => (
                <button
                  key={sz}
                  type="button"
                  onMouseDown={e => e.stopPropagation()}
                  onClick={() => setFontSize(sz)}
                  className={`flex-1 rounded-lg py-1.5 text-xs transition-all ${
                    config.fontSize === sz
                      ? 'bg-white font-bold text-blue-600 shadow dark:bg-slate-700'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-slate-300'
                  }`}
                >
                  {sz === 'small' ? 'صغير' : sz === 'medium' ? 'متوسط' : 'كبير'}
                </button>
              ))}
            </div>
          </div>

          {/* Column Manager */}
          <div>
            <label className="mb-2 block text-xs font-bold text-gray-500">إدارة الأعمدة</label>
            <div className="custom-scrollbar max-h-60 divide-y overflow-y-auto rounded-xl border dark:divide-slate-700 dark:border-slate-700">
              {config.columns.map((col, index) => (
                <div
                  key={col.id}
                  className="flex items-center justify-between px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50"
                >
                  <div className="flex items-center gap-2 max-md:gap-2">
                    <button
                      type="button"
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => toggleColumnVisibility(col.id)}
                      className="rounded p-1 text-gray-400 transition-colors hover:text-blue-500 max-md:p-1"
                    >
                      {col.visible ? (
                        <Eye size={13} className="text-blue-500" />
                      ) : (
                        <EyeOff size={13} />
                      )}
                    </button>
                    <span className={`text-xs ${!col.visible ? 'line-through opacity-40' : ''}`}>
                      {col.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-0 max-md:gap-0.5">
                    <button
                      type="button"
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => moveColumnUp(index)}
                      disabled={index === 0}
                      className="rounded p-1 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-20 dark:hover:text-slate-300 max-md:p-1"
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      type="button"
                      onMouseDown={e => e.stopPropagation()}
                      onClick={() => moveColumnDown(index)}
                      disabled={index === config.columns.length - 1}
                      className="rounded p-1 text-gray-400 transition-colors hover:text-gray-700 disabled:opacity-20 dark:hover:text-slate-300 max-md:p-1"
                    >
                      <ArrowDown size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
