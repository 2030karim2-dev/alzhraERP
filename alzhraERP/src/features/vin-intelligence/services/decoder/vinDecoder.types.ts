/**
 * Normalized Vehicle Identity
 * Defines the canonical vehicle structure required by the system.
 */
export interface VehicleIdentity {
  id?: string; // UUID from vehicle_knowledge_base if exists
  vin: string;
  make: string;
  model: string;
  year: number;
  generation?: string;
  engineCode?: string;
  engineSize?: string;
  cylinderCount?: number;
  fuelType?: string;
  transmission?: string;
  driveType?: string;
  market?: string;
  bodyType?: string;
  cabType?: string;
}

export interface VinDecodeResult {
  status: 'SUCCESS' | 'VIN_NOT_FOUND' | 'DECODER_UNAVAILABLE' | 'INVALID_VIN';
  vehicle: VehicleIdentity | null;
  errorDetail?: string;
}

export interface IVinDecoder {
  /**
   * Decodes a normalized VIN into a VehicleIdentity.
   * Does NOT throw. Returns a VinDecodeResult capturing any failure state safely.
   */
  decodeVin(vin: string): Promise<VinDecodeResult>;
}
