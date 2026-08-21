/**
 * VIN Intelligence — Domain Types
 * Provider-independent models consumed by the UI layer.
 */

export type VinDecodeMode = 'hybrid' | 'db' | 'ai';
export type VinDecodeSource = 'db' | 'ai' | 'manual' | 'vpic';

export type CompatibilityStatus = 'CONFIRMED' | 'POSSIBLE' | 'UNKNOWN' | 'NOT_COMPATIBLE';

export interface VehicleInfo {
  id?: string;
  make: string;
  model?: string | null;
  submodel?: string | null;
  year?: number | null;
  yearStart?: number | null;
  yearEnd?: number | null;
  engine?: string | null;
  displacement?: string | null;
  cylinders?: string | null;
  bodyType?: string | null;
  driveType?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  region?: string | null;
  market?: string | null;
  vinPrefix?: string | null;
}

export interface VinDecodeResult {
  vin: string;
  found: boolean;
  source: VinDecodeSource;
  vehicle: VehicleInfo | null;
  confidence: 'high' | 'medium' | 'low' | null;
  rawAi?: unknown;
}

export interface MatchingInventoryProduct {
  product_id: string;
  sku: string;
  part_number: string | null;
  name_ar: string;
  brand: string | null;
  sale_price: number;
  status: string;
  compatibility_status: CompatibilityStatus;
  match_source: string;
}

export interface ExtractedPart {
  partNumber: string;
  manufacturer?: string;
  description?: string;
  category?: string;
  oemNumbers?: string[];
  source: 'ai' | 'manual' | 'fapi' | 'megazip';
  confidence?: 'high' | 'medium' | 'low';
  salePrice?: number;
  purchasePrice?: number;
}

export interface VinAnalysisRecord {
  id: string;
  vin: string;
  vehicle_id: string | null;
  decoded: unknown;
  source: string;
  created_at: string;
}

export interface VehicleProductLink {
  id?: string;
  company_id?: string;
  vehicle_id: string;
  product_id: string;
  fitment_status: CompatibilityStatus;
  source: 'manual' | 'vin_extract';
  created_by?: string | null;
}
