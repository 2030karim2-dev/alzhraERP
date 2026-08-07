import React, { useState } from 'react';
import { Search, Camera, X, Loader2 } from 'lucide-react';
import { vinAnalysisService } from '../services/vinAnalysisService';

interface VINSearchProps {
  onAnalyze: (vin: string) => void;
  isAnalyzing: boolean;
  recentVins?: string[];
  onSelectRecent?: (vin: string) => void;
}

const VINSearch: React.FC<VINSearchProps> = ({ onAnalyze, isAnalyzing, recentVins = [], onSelectRecent }) => {
  const [vin, setVin] = useState('');
  const [validation, setValidation] = useState<{ valid: boolean; message?: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/\s+/g, '').slice(0, 17);
    setVin(value);
    if (value) {
      setValidation(vinAnalysisService.validateVin(value));
    } else {
      setValidation(null);
    }
  };

  const handleClear = () => { setVin(''); setValidation(null); };

  const handleAnalyze = () => {
    const v = vin.trim();
    if (!v) return;
    const result = vinAnalysisService.validateVin(v);
    if (result.valid) onAnalyze(v.toUpperCase().replace(/\s+/g, ''));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAnalyzing) handleAnalyze();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search size={14} className="text-[var(--app-text-secondary)]" />
          </div>
          <input
            type="text"
            value={vin}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="VIN / Chassis Number"
            dir="ltr"
            className="w-full h-9 pl-9 pr-16 text-[11px] font-mono font-bold tracking-wider bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-[var(--app-text)] placeholder:text-[var(--app-text-secondary)]"
            disabled={isAnalyzing}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-1 gap-0.5">
            {vin && (
              <button onClick={handleClear} className="p-1 hover:bg-[var(--app-surface-hover)] rounded" title="Clear">
                <X size={12} className="text-[var(--app-text-secondary)]" />
              </button>
            )}
            <button
              onClick={() => {}}
              className="p-1.5 hover:bg-[var(--app-surface-hover)] rounded opacity-40 cursor-not-allowed"
              title="Coming soon"
              disabled
            >
              <Camera size={14} className="text-[var(--app-text-secondary)]" />
            </button>
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !vin}
          className="flex items-center gap-1.5 h-9 px-4 bg-blue-600 text-white rounded-lg text-[10px] font-bold active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 transition-all"
        >
          {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          <span>Analyze with AI</span>
        </button>
      </div>
      {validation && !validation.valid && (
        <p className="text-[9px] font-bold text-rose-500 px-1">{validation.message}</p>
      )}
      {vin.length > 0 && (
        <p className="text-[9px] text-[var(--app-text-secondary)] px-1 font-mono">
          {vin.length}/17 characters
        </p>
      )}
      {recentVins.length > 0 && !isAnalyzing && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="text-[8px] font-bold text-[var(--app-text-secondary)] uppercase tracking-widest px-1">Recent:</span>
          {recentVins.slice(0, 5).map(rv => (
            <button
              key={rv}
              onClick={() => { setVin(rv); onSelectRecent?.(rv); }}
              className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-md text-[9px] font-mono font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all border border-indigo-100 dark:border-indigo-800/50"
            >
              {rv}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default VINSearch;
