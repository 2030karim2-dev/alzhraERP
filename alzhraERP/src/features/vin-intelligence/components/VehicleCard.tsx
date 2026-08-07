import React, { useMemo } from 'react';
import { Car, Gauge, Wrench, Fuel, Cog, Globe } from 'lucide-react';
import type { VehicleConfiguration } from '../types';
import { useTranslation } from '../../../lib/hooks/useTranslation';

interface VehicleCardProps {
  vehicle: VehicleConfiguration;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle }) => {
  const { t } = useTranslation();
  const rows = useMemo(() => [
    { icon: <Car size={11} />, label: t('vin_make'), value: vehicle.make },
    { icon: <Car size={11} />, label: t('vin_model'), value: vehicle.model },
    { icon: null, label: t('vin_year'), value: vehicle.year ?? t('vin_not_available') },
    { icon: <Gauge size={11} />, label: t('vin_engine_label'), value: vehicle.engineSize ?? t('vin_not_available') },
    { icon: <Wrench size={11} />, label: t('vin_engine_code'), value: vehicle.engineCode ?? t('vin_not_available') },
    { icon: null, label: t('vin_cylinders'), value: vehicle.cylinderCount ?? t('vin_not_available') },
    { icon: <Fuel size={11} />, label: t('vin_fuel'), value: vehicle.fuelType ?? t('vin_not_available') },
    { icon: <Cog size={11} />, label: t('vin_transmission'), value: vehicle.transmission ?? t('vin_not_available') },
    { icon: null, label: t('vin_drive'), value: vehicle.driveType ?? t('vin_not_available') },
    { icon: <Globe size={11} />, label: t('vin_market'), value: vehicle.market ?? t('vin_not_available') },
    { icon: null, label: t('vin_body'), value: vehicle.bodyType ?? t('vin_not_available') },
    { icon: null, label: t('vin_cab'), value: vehicle.cabType ?? t('vin_not_available') },
  ], [vehicle, t]);

  return (
    <div className="bg-[var(--app-surface)] border border-[var(--app-border)] rounded-xl shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-3 py-2">
        <h2 className="text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
          <Car size={12} />
          {vehicle.make} {vehicle.model} {vehicle.year}
        </h2>
        {vehicle.generation && (
          <p className="text-[8px] text-blue-100 font-medium mt-0.5">{vehicle.generation}</p>
        )}
      </div>
      <div className="p-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
        {rows.filter(r => r.value !== undefined).map((row, i) => (
          <div key={i} className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-lg p-1.5 text-center">
            <div className="flex items-center justify-center gap-0.5 text-[var(--app-text-secondary)] mb-0.5">
              {row.icon}
              <span className="text-[7px] font-bold uppercase tracking-widest">{row.label}</span>
            </div>
            <span className="text-[10px] font-bold text-[var(--app-text)] block truncate">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VehicleCard;
