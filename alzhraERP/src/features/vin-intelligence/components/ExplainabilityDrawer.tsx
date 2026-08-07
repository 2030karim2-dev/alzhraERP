import React from 'react';
import { X, Car, Wrench, CheckCircle2, AlertTriangle, HelpCircle, XCircle } from 'lucide-react';
import type { VehicleCorePart, VehicleConfiguration } from '../types';

interface ExplainabilityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleConfiguration;
  part: VehicleCorePart;
}

const ExplainabilityDrawer: React.FC<ExplainabilityDrawerProps> = ({ isOpen, onClose, vehicle, part }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-[var(--app-surface)] border border-[var(--app-border)] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[80vh] overflow-y-auto p-4 animate-in slide-in-from-bottom">
        <button onClick={onClose} className="absolute top-3 right-3 p-1 hover:bg-[var(--app-surface-hover)] rounded-lg">
          <X size={14} className="text-[var(--app-text-secondary)]" />
        </button>

        <h2 className="text-[11px] font-black uppercase tracking-widest text-[var(--app-text)] mb-4">
          {part.fitmentStatus === 'NOT_COMPATIBLE' 
            ? 'Why is this part NOT compatible?'
            : 'Why is this part compatible?'}
        </h2>

        <div className="space-y-3">
          <div className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg p-2.5">
            <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)] mb-1.5">Vehicle Configuration</p>
            <div className="flex items-center gap-2">
              <Car size={14} className="text-blue-500" />
              <span className="font-bold text-[10px] text-[var(--app-text)]">{vehicle.make} {vehicle.model} {vehicle.year}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 mt-1.5 text-[9px]">
              <div><span className="text-[var(--app-text-secondary)]">Engine:</span> <span className="font-bold">{vehicle.engineSize}</span></div>
              <div><span className="text-[var(--app-text-secondary)]">Fuel:</span> <span className="font-bold">{vehicle.fuelType}</span></div>
              <div><span className="text-[var(--app-text-secondary)]">Drive:</span> <span className="font-bold">{vehicle.driveType}</span></div>
            </div>
          </div>

          <div className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg p-2.5">
            <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)] mb-1.5">Part</p>
            <div className="flex items-center gap-2">
              <Wrench size={14} className="text-indigo-500" />
              <span className="font-bold text-[10px] text-[var(--app-text)]">{part.canonicalPartName}</span>
            </div>
            {part.oemNumbers.length > 0 && (
              <p className="text-[9px] font-mono text-indigo-600 mt-1">OEM: {part.oemNumbers.join(', ')}</p>
            )}
          </div>

          <div className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg p-2.5">
            <p className="text-[8px] font-bold uppercase tracking-widest text-[var(--app-text-secondary)] mb-1.5">Fitment</p>
            <div className="flex items-center gap-1.5">
              {part.fitmentStatus === 'VERIFIED' && <CheckCircle2 size={14} className="text-emerald-500" />}
              {part.fitmentStatus === 'INFERRED' && <AlertTriangle size={14} className="text-amber-500" />}
              {part.fitmentStatus === 'UNKNOWN' && <HelpCircle size={14} className="text-slate-400" />}
              {part.fitmentStatus === 'NOT_COMPATIBLE' && <XCircle size={14} className="text-rose-400" />}
              <span className="font-bold text-[10px]">{part.fitmentStatus}</span>
            </div>
            <p className="text-[9px] text-[var(--app-text-secondary)] mt-1">
              <span className="font-bold">Evidence:</span> {part.evidence || 'No evidence available'}
            </p>
            <p className="text-[9px] text-[var(--app-text-secondary)]">
              <span className="font-bold">Source:</span> {part.evidenceSource || 'Unknown'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExplainabilityDrawer;
