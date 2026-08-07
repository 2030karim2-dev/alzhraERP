import React, { useMemo } from 'react';
import { Car, Gauge, Wrench, Fuel, Cog, Globe } from 'lucide-react';
import type { VehicleConfiguration } from '../types';

interface VehicleCardProps {
  vehicle: VehicleConfiguration;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ vehicle }) => {
  const rows = useMemo(() => [
    { icon: <Car size={11} />, label: 'Make', value: vehicle.make },
    { icon: <Car size={11} />, label: 'Model', value: vehicle.model },
    { icon: null, label: 'Year', value: vehicle.year ?? 'Not available' },
    { icon: <Gauge size={11} />, label: 'Engine', value: vehicle.engineSize ?? 'Not available' },
    { icon: <Wrench size={11} />, label: 'Engine Code', value: vehicle.engineCode ?? 'Not available' },
    { icon: null, label: 'Cylinders', value: vehicle.cylinderCount ?? 'Not available' },
    { icon: <Fuel size={11} />, label: 'Fuel', value: vehicle.fuelType ?? 'Not available' },
    { icon: <Cog size={11} />, label: 'Transmission', value: vehicle.transmission ?? 'Not available' },
    { icon: null, label: 'Drive', value: vehicle.driveType ?? 'Not available' },
    { icon: <Globe size={11} />, label: 'Market', value: vehicle.market ?? 'Not available' },
    { icon: null, label: 'Body', value: vehicle.bodyType ?? 'Not available' },
    { icon: null, label: 'Cab', value: vehicle.cabType ?? 'Not available' },
  ], [vehicle]);

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
