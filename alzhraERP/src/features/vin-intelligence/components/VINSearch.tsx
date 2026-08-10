import React, { useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useTranslation } from '../../../lib/hooks/useTranslation';
import { validateVin, VALID_VIN_LENGTHS } from '../utils/vinValidator';

interface VINSearchProps {
  onAnalyze: (vin: string) => void;
  isAnalyzing: boolean;
  recentVins?: string[];
  onSelectRecent?: (vin: string) => void;
}

/** Maps validation errors to user-facing messages */
const ERROR_MESSAGES: Record<string, string> = {
  EMPTY_INPUT: 'VIN is empty.',
  INVALID_LENGTH: `Invalid VIN length — must be ${VALID_VIN_LENGTHS.join(', ')} characters.`,
  INVALID_CHARACTERS: 'VIN contains invalid characters (I, O, or Q are not allowed).',
};

/** Max VIN length we allow the user to type (17 is the NHTSA standard max) */
const MAX_VIN_LENGTH = 17;

const VINSearch: React.FC<VINSearchProps> = ({ onAnalyze, isAnalyzing, recentVins = [], onSelectRecent }) => {
  const { t } = useTranslation();
  const [vin, setVin] = useState('');
  const [validation, setValidation] = useState<{ valid: boolean; message?: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/\s+/g, '').slice(0, MAX_VIN_LENGTH);
    setVin(value);
    if (value) {
      const result = validateVin(value);
      setValidation({ valid: result.isValid, message: result.error ? ERROR_MESSAGES[result.error] : undefined });
    } else {
      setValidation(null);
    }
  };

  const handleClear = () => { setVin(''); setValidation(null); };

  const handleAnalyze = () => {
    const v = vin.trim();
    if (!v) return;
    const result = validateVin(v);
    if (result.isValid) onAnalyze(result.normalizedVin);
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
            placeholder={t('vin_search_placeholder')}
            dir="ltr"
            className="w-full h-9 pl-9 pr-10 text-[11px] font-mono font-bold tracking-wider bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-[var(--app-text)] placeholder:text-[var(--app-text-secondary)]"
            disabled={isAnalyzing}
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">
            {vin && (
              <button onClick={handleClear} className="p-1 hover:bg-[var(--app-surface-hover)] rounded" title={t('vin_clear')}>
                <X size={12} className="text-[var(--app-text-secondary)]" />
              </button>
            )}
          </div>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={isAnalyzing || !vin || (validation !== null && !validation.valid)}
          className="flex items-center gap-1.5 h-9 px-4 bg-blue-600 text-white rounded-lg text-[10px] font-bold active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-500/20 transition-all"
        >
          {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
          <span>{t('vin_analyze_btn')}</span>
        </button>
      </div>
      {validation && !validation.valid && (
        <p className="text-[9px] font-bold text-rose-500 px-1">{validation.message}</p>
      )}
      {vin.length > 0 && (
        <p className="text-[9px] text-[var(--app-text-secondary)] px-1 font-mono">
          {t('vin_characters_count', { count: vin.length })}
        </p>
      )}
      {recentVins.length > 0 && !isAnalyzing && (
        <div className="flex flex-wrap gap-1.5 mt-1">
          <span className="text-[8px] font-bold text-[var(--app-text-secondary)] uppercase tracking-widest px-1">{t('vin_recent')}:</span>
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
