import React from 'react';
import { TableProperties } from 'lucide-react';
import { useAccompanyingInfoStore } from '../store/accompanyingInfoStore';

export const AccompanyingInfoToggle: React.FC = () => {
  const { enabled, isOpen, toggleOpen } = useAccompanyingInfoStore();

  if (!enabled) return null;

  return (
    <button
      onClick={toggleOpen}
      title="المعلومات المرافقة (فحص لحظي للعملاء والأصناف والفواتير بنمط الإكسل)"
      aria-label="المعلومات المرافقة"
      className={`relative flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all duration-200 ${
        isOpen
          ? 'border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-2 ring-blue-400/30'
          : 'border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] hover:bg-[var(--app-surface-hover)]'
      }`}
    >
      <TableProperties size={15} className={isOpen ? 'text-white' : 'text-blue-500'} />
      <span className="hidden text-[11px] font-semibold lg:inline">المعلومات المرافقة</span>

      {/* نقطة حالة خضراء عند التفعيل */}
      {isOpen && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
        </span>
      )}
    </button>
  );
};
