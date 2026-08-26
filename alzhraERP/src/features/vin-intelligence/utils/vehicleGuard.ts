/**
 * Runtime type guard for VehicleInfo records coming from the DB.
 * The `vin_analyses.decoded` column is JSONB; rows may contain anything.
 * Without this guard, a single corrupt row crashes the page silently.
 */
import type { VehicleInfo } from '../types';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const hasValidOptionalStrings = (value: Record<string, unknown>, keys: string[]): boolean => {
  for (const key of keys) {
    const entry = Object.entries(value).find(([k]) => k === key);
    if (entry != null && entry[1] !== null && typeof entry[1] !== 'string') return false;
  }
  return true;
};

const hasValidOptionalNumbers = (value: Record<string, unknown>, keys: string[]): boolean => {
  for (const key of keys) {
    const entry = Object.entries(value).find(([k]) => k === key);
    if (entry != null && entry[1] !== null && typeof entry[1] !== 'number') return false;
  }
  return true;
};

export function isValidVehicleInfo(value: unknown): value is VehicleInfo {
  if (!isPlainObject(value)) return false;
  if (typeof value.make !== 'string' || value.make.trim().length === 0) return false;
  const optionalStrings = [
    'model',
    'submodel',
    'trim',
    'engine',
    'displacement',
    'cylinders',
    'bodyType',
    'driveType',
    'fuelType',
    'transmission',
    'region',
    'market',
    'vinPrefix',
    'doors',
    'brakeSystem',
    'vehicleType',
    'id',
  ];
  if (!hasValidOptionalStrings(value, optionalStrings)) return false;
  if (!hasValidOptionalNumbers(value, ['year', 'yearStart', 'yearEnd'])) return false;
  return true;
}

export function safeParseVehicleInfo(value: unknown): VehicleInfo | null {
  return isValidVehicleInfo(value) ? value : null;
}
