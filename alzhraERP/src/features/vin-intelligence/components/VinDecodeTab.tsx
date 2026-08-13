import React, { useState } from 'react';
import { ScanLine, Sparkles, Database, History, Car } from 'lucide-react';
import Input from '../../../ui/base/Input';
import Button from '../../../ui/base/Button';
import Card from '../../../ui/base/Card';
import { cn } from '../../../core/utils';
import { validateVin } from '../utils/vinValidator';
import type { VinAnalysisRecord, VinDecodeMode, VinDecodeResult, VehicleInfo } from '../types';

interface VinDecodeTabProps {
  isDecoding: boolean;
  error: string | null;
  result: VinDecodeResult | null;
  history: VinAnalysisRecord[];
  onDecode: (vin: string, mode: VinDecodeMode) => Promise<void>;
}

const MODES: { id: VinDecodeMode; label: string; icon: typeof ScanLine }[] = [
  { id: 'hybrid', label: 'تلقائي (قاعدة بيانات + ذكاء اصطناعي)', icon: Sparkles },
  { id: 'db', label: 'يدوي (فك بنيوي)', icon: Database },
  { id: 'ai', label: 'ذكاء اصطناعي', icon: Sparkles },
];

export const VinDecodeTab: React.FC<VinDecodeTabProps> = ({
  isDecoding,
  error,
  result,
  history,
  onDecode,
}) => {
  const [vin, setVin] = useState('');
  const [mode, setMode] = useState<VinDecodeMode>('hybrid');

  const validation = validateVin(vin);
  const canDecode = vin.trim().length > 0 && validation.isValid && !isDecoding;

  const handleDecode = async () => {
    if (!canDecode) return;
    await onDecode(vin, mode);
  };

  return (
    <div className="space-y-2">
      <Card isMicro>
        <div className="space-y-2">
          <Input
            variant="micro"
            label="رقم الشاصي (VIN)"
            placeholder="مثال: JTDBR32E100001234"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDecode()}
            icon={<ScanLine />}
          />
          {vin && !validation.isValid && (
            <p className="text-[10px] text-rose-600 font-semibold px-1">
              {validation.error === 'INVALID_LENGTH'
                ? 'رقم الشاصي يجب أن يكون بين 11 و 17 خانة'
                : 'رموز غير صالحة (لا يُسمح بالأحرف I, O, Q)'}
            </p>
          )}

          <div className="flex flex-wrap gap-1">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-1 rounded-[var(--radius)] text-[10px] font-bold border transition-colors',
                  mode === m.id
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-[var(--app-bg)] text-[var(--app-text-secondary)] border-[var(--app-border)] hover:bg-[var(--app-surface-hover)]',
                )}
              >
                <m.icon size={12} /> {m.label}
              </button>
            ))}
          </div>

          <Button size="sm" onClick={handleDecode} disabled={!canDecode} isLoading={isDecoding} fullWidth>
            فك الشاصي
          </Button>

          {error && <p className="text-[10px] text-rose-600 font-semibold">{error}</p>}
        </div>
      </Card>

      {result?.vehicle && (
        <VehicleCard vehicle={result.vehicle} source={result.source} confidence={result.confidence} />
      )}

      {history.length > 0 && (
        <Card isMicro>
          <div className="flex items-center gap-1.5 mb-1.5">
            <History size={12} className="text-[var(--app-text-secondary)]" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">
              آخر الشواصي التي تم تحليلها
            </h3>
          </div>
          <div className="flex flex-wrap gap-1">
            {history.slice(0, 10).map((h) => (
              <button
                key={h.id}
                onClick={() => setVin(h.vin)}
                className="px-2 py-1 rounded-[var(--radius)] text-[10px] font-mono font-bold bg-[var(--app-bg)] border border-[var(--app-border)] text-blue-600 hover:bg-[var(--app-surface-hover)]"
                title="إعادة فك هذا الشاصي"
              >
                {h.vin}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

function VehicleCard({
  vehicle,
  source,
  confidence,
}: {
  vehicle: VehicleInfo;
  source: string;
  confidence: string | null;
}) {
  const rows: Array<[string, string]> = (
    [
      ['الشركة المصنعة', vehicle.make],
      ['الموديل', vehicle.model ?? null],
      ['سنة الصنع', vehicle.year ? String(vehicle.year) : null],
      ['المحرك', vehicle.engine ?? null],
      ['نوع الهيكل', vehicle.bodyType ?? null],
      ['ناقل الحركة', vehicle.transmission ?? null],
      ['نوع الوقود', vehicle.fuelType ?? null],
      ['المنطقة', vehicle.region ?? null],
    ] as Array<[string, string | null]>
  ).filter(([, v]) => !!v) as Array<[string, string]>;

  return (
    <Card isMicro>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Car size={14} className="text-blue-600" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--app-text)]">
            {vehicle.make} {vehicle.model ?? ''}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
            {source === 'vpic' ? 'vPIC رسمي' : source === 'db' ? 'من قاعدة البيانات' : 'ذكاء اصطناعي'}
          </span>
          {confidence && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              {confidence}
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-1">
        {rows.map(([k, v]) => (
          <div key={k} className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg px-2 py-1">
            <p className="text-[8px] font-black uppercase text-[var(--app-text-secondary)]">{k}</p>
            <p className="text-[11px] font-bold text-[var(--app-text)] truncate">{v}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
