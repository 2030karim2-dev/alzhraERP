import type { IVinDecoder, VinDecodeResult, VehicleIdentity } from './vinDecoder.types';

/**
 * Real VIN Decoder using the public US DOT NHTSA vPIC API.
 * Excellent for testing real-world API latency, error handling, and decoding
 * without requiring commercial API credentials.
 */
export class NhtsaVinDecoderProvider implements IVinDecoder {
  private readonly API_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues';

  async decodeVin(vin: string): Promise<VinDecodeResult> {
    try {
      const response = await fetch(`${this.API_URL}/${vin}?format=json`);
      
      if (!response.ok) {
        if (response.status === 429) {
          return { status: 'DECODER_UNAVAILABLE', vehicle: null, errorDetail: 'NHTSA API Rate Limited.' };
        }
        return { status: 'DECODER_UNAVAILABLE', vehicle: null, errorDetail: `HTTP Error: ${response.status}` };
      }

      const data = await response.json();
      const results = data.Results?.[0];

      if (!results || results.ErrorCode !== '0') {
        // NHTSA returns specific error codes in the payload if the VIN is bad.
        const errorMsg = results?.ErrorText || 'Unknown NHTSA Error';
        return { 
          status: 'VIN_NOT_FOUND', 
          vehicle: null, 
          errorDetail: errorMsg 
        };
      }

      // Map NHTSA fields to our canonical VehicleIdentity
      const vehicle: VehicleIdentity = {
        vin: vin,
        make: this.sanitize(results.Make),
        model: this.sanitize(results.Model),
        year: parseInt(results.ModelYear, 10) || 0,
        engineSize: results.DisplacementL ? `${results.DisplacementL}L` : undefined,
        cylinderCount: parseInt(results.EngineCylinders, 10) || undefined,
        fuelType: this.sanitize(results.FuelTypePrimary),
        transmission: this.sanitize(results.TransmissionStyle),
        driveType: this.sanitize(results.DriveType),
        bodyType: this.sanitize(results.BodyClass),
        market: 'US/NHTSA', // NHTSA implicitly means US market decode
      };

      // Strict enforcement: Do not return a vehicle if Make/Model/Year are utterly missing
      if (!vehicle.make || !vehicle.model || !vehicle.year) {
        return {
          status: 'VIN_NOT_FOUND',
          vehicle: null,
          errorDetail: 'Provider returned insufficient vehicle data (missing Make, Model, or Year).'
        };
      }

      return {
        status: 'SUCCESS',
        vehicle,
      };

    } catch (error: any) {
      // Network failures, timeouts, CORS issues
      return {
        status: 'DECODER_UNAVAILABLE',
        vehicle: null,
        errorDetail: error.message || 'Network failure reaching NHTSA API.'
      };
    }
  }

  private sanitize(value: string | undefined | null): string {
    if (!value || value.trim() === '' || value.toUpperCase() === 'NOT APPLICABLE') {
      return '';
    }
    return value.trim();
  }
}
