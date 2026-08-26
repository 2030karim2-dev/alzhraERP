/**
 * Runtime type guard for VehicleInfo records coming from the DB.
 * The `vin_analyses.decoded` column is JSONB; rows may contain anything.
 * Without this guard, a single corrupt row crashes the page silently.
 */
import type { VehicleInfo } from '../types';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function isValidVehicleInfo(value: unknown): value is VehicleInfo {
  if (!isPlainObject(value)) return false;
  if (typeof value.make !== 'string' || value.make.trim().length === 0) return false;
  const optionalStrings = [
    'model', 'submodel', 'trim', 'engine', 'displacement', 'cylinders',
    'bodyType', 'driveType', 'fuelType', 'transmission', 'region', 'market',
    'vinPrefix', 'doors', 'brakeSystem', 'vehicleType', 'id',
  ];
  for (const key of optionalStrings) {
    if (key in value && value[key] !== null && typeof value[key] !== 'string') return false;
  }
  for (const key of ['year', 'yearStart', 'yearEnd']) {
    if (key in value && value[key] !== null && typeof value[key] !== 'number') return false;
  }
  return true;
}

export function safeParseVehicleInfo(value: unknown): VehicleInfo | null {
  return isValidVehicleInfo(value) ? value : null;
}
