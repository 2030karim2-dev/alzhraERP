import type { VehicleCorePart } from '../types';

export const groupByCategory = (parts: VehicleCorePart[]): Record<string, VehicleCorePart[]> => {
  const grouped: Record<string, VehicleCorePart[]> = {};
  parts.forEach(p => {
    if (!grouped[p.category]) grouped[p.category] = [];
    grouped[p.category].push(p);
  });
  return grouped;
};
