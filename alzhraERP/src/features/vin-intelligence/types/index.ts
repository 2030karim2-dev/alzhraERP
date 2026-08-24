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
  trim?: string | null;
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
  doors?: string | null;
  brakeSystem?: string | null;
  vehicleType?: string | null;
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

export interface PartAlternative {
  partNumber: string;
  brand?: string;
  type?: 'OEM' | 'AFTERMARKET' | 'SUPERSEDED';
  descriptionAr?: string;
  descriptionEn?: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;
  source?: string;
}

export interface CompatibleVehicle {
  make: string;
  makeAr: string;
  model: string;
  modelAr: string;
  yearRange: string;
  engine?: string | undefined;
  notes?: string | undefined;
}

export interface ExtractedPart {
  partNumber: string;
  manufacturer?: string;
  description?: string;        // الاسم بالعربية
  descriptionEn?: string;      // Name in English
  category?: string;           // الفئة بالعربية
  categoryEn?: string;         // Category in English
  oemNumbers?: string[];
  alternatives?: PartAlternative[];
  compatibleVehicles?: CompatibleVehicle[];
  source: 'ai' | 'manual' | 'fapi' | 'megazip' | 'partsouq' | 'spareto' | 'autodoc' | 'amayama' | 'catalog';
  confidence?: 'high' | 'medium' | 'low';
  confidenceScore?: number;    // e.g. 95 (percentage)
  sizeSpec?: string;
  salePrice?: number;
  purchasePrice?: number;
  specs?: Record<string, string>;
  imageUrl?: string | null;
}

export interface ExcelGridPart extends ExtractedPart {
  _id: string;
  baseName: string;
  sizeSpec?: string;
  selected?: boolean;
}

export interface PartIntelligenceResult {
  partNumber: string;
  primaryNameAr: string;
  primaryNameEn: string;
  categoryAr: string;
  categoryEn: string;
  manufacturer: string;
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;
  confidenceReason: string;
  alternatives: PartAlternative[];
  compatibleVehicles: CompatibleVehicle[];
  specs: Record<string, string>;
  source: string;
  imageUrl?: string | null;
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
