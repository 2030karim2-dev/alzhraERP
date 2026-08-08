import type { IVinDecoder, VinDecodeResult } from './vinDecoder.types';

export class MockVinDecoderService implements IVinDecoder {
  async decodeVin(vin: string): Promise<VinDecodeResult> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    // Known test VIN (Toyota Land Cruiser)
    if (vin === 'JTMHT05J504012345') {
      return {
        status: 'SUCCESS',
        vehicle: {
          vin,
          make: 'Toyota',
          model: 'Land Cruiser',
          year: 2023,
          generation: 'J300',
          engineCode: 'V35A-FTS',
          engineSize: '3.4L',
          cylinderCount: 6,
          fuelType: 'Gasoline',
          transmission: '10-Speed Automatic',
          driveType: '4WD',
          market: 'GCC',
          bodyType: 'SUV'
        }
      };
    }

    // Known test VIN (Nissan Patrol)
    if (vin === 'JN1TANS82U0123456') {
      return {
        status: 'SUCCESS',
        vehicle: {
          vin,
          make: 'Nissan',
          model: 'Patrol',
          year: 2022,
          generation: 'Y62',
          engineCode: 'VK56VD',
          engineSize: '5.6L',
          cylinderCount: 8,
          fuelType: 'Gasoline',
          transmission: '7-Speed Automatic',
          driveType: '4WD',
          market: 'GCC',
          bodyType: 'SUV'
        }
      };
    }

    // Simulate an unknown VIN
    if (vin.startsWith('UNKNOWN')) {
      return {
        status: 'VIN_NOT_FOUND',
        vehicle: null,
        errorDetail: 'The VIN was structurally valid but no vehicle data was found.'
      };
    }

    // Simulate service outage
    if (vin.startsWith('ERROR')) {
      return {
        status: 'DECODER_UNAVAILABLE',
        vehicle: null,
        errorDetail: 'The decoding service timed out or returned a 500 error.'
      };
    }

    // Default fallback for any other valid VIN
    return {
      status: 'SUCCESS',
      vehicle: {
        vin,
        make: 'Generic Make',
        model: 'Generic Model',
        year: 2020,
      }
    };
  }
}
