/**
 * Mock Vehicles — realistic automotive data for Phase 1
 * Based on common GCC/Middle Eastern market vehicles
 */
import type { VehicleConfiguration } from '../types';

export const mockVehicles: Record<string, VehicleConfiguration> = {
  // Toyota Hilux 2015 GCC
  'JTB53AEB1W0025920': {
    vin: 'JTB53AEB1W0025920',
    make: 'Toyota',
    model: 'Hilux',
    year: 2015,
    generation: '7th Gen (AN120/AN130)',
    engineCode: '2TR-FE',
    engineSize: '2.7L',
    cylinderCount: 4,
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    driveType: '4WD',
    market: 'GCC',
    bodyType: 'Pickup',
    cabType: 'Double Cab',
  },

  // Toyota Land Cruiser 2020 GCC
  'JTMHV05J804123456': {
    vin: 'JTMHV05J804123456',
    make: 'Toyota',
    model: 'Land Cruiser',
    year: 2020,
    generation: '200 Series',
    engineCode: '1GR-FE',
    engineSize: '4.0L',
    cylinderCount: 6,
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    driveType: '4WD',
    market: 'GCC',
    bodyType: 'SUV',
    cabType: undefined,
  },

  // Nissan Patrol 2018 GCC
  'JN1TANY62A0012345': {
    vin: 'JN1TANY62A0012345',
    make: 'Nissan',
    model: 'Patrol',
    year: 2018,
    generation: 'Y62',
    engineCode: 'VK56VD',
    engineSize: '5.6L',
    cylinderCount: 8,
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    driveType: '4WD',
    market: 'GCC',
    bodyType: 'SUV',
    cabType: undefined,
  },

  // Toyota Camry 2019 GCC
  'JTNBF3HK503012345': {
    vin: 'JTNBF3HK503012345',
    make: 'Toyota',
    model: 'Camry',
    year: 2019,
    generation: 'XV70',
    engineCode: '2AR-FE',
    engineSize: '2.5L',
    cylinderCount: 4,
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    driveType: 'FWD',
    market: 'GCC',
    bodyType: 'Sedan',
    cabType: undefined,
  },

  // Hyundai Accent 2017 GCC
  'KMHCT4AE0HU123456': {
    vin: 'KMHCT4AE0HU123456',
    make: 'Hyundai',
    model: 'Accent',
    year: 2017,
    generation: '4th Gen (RB)',
    engineCode: 'Gamma',
    engineSize: '1.6L',
    cylinderCount: 4,
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    driveType: 'FWD',
    market: 'GCC',
    bodyType: 'Sedan',
    cabType: undefined,
  },

  // Toyota Corolla 2021 GCC
  'JTDEPRAE9MJ123456': {
    vin: 'JTDEPRAE9MJ123456',
    make: 'Toyota',
    model: 'Corolla',
    year: 2021,
    generation: 'E210',
    engineCode: '2ZR-FE',
    engineSize: '1.8L',
    cylinderCount: 4,
    fuelType: 'Gasoline',
    transmission: 'CVT',
    driveType: 'FWD',
    market: 'GCC',
    bodyType: 'Sedan',
    cabType: undefined,
  },

  // Suzuki Carry 2002 (Japanese short VIN)
  'DA62T-349212': {
    vin: 'DA62T-349212',
    make: 'Suzuki',
    model: 'Carry',
    year: 2002,
    generation: 'DA62T',
    engineCode: 'K6A',
    engineSize: '0.66L',
    cylinderCount: 3,
    fuelType: 'Gasoline',
    transmission: 'Manual',
    driveType: 'RWD',
    market: 'Japan',
    bodyType: 'Mini Truck',
    cabType: 'Single Cab',
  },

  // Mitsubishi Pajero 2016 GCC
  'JMYLYV98WGJ123456': {
    vin: 'JMYLYV98WGJ123456',
    make: 'Mitsubishi',
    model: 'Pajero',
    year: 2016,
    generation: '4th Gen (V80)',
    engineCode: '6G74',
    engineSize: '3.5L',
    cylinderCount: 6,
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    driveType: '4WD',
    market: 'GCC',
    bodyType: 'SUV',
    cabType: undefined,
  },

  // Ford F-150 2020 USA
  '1FTEW1E50LFA12345': {
    vin: '1FTEW1E50LFA12345',
    make: 'Ford',
    model: 'F-150',
    year: 2020,
    generation: '14th Gen',
    engineCode: '3.5L EcoBoost',
    engineSize: '3.5L',
    cylinderCount: 6,
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    driveType: '4WD',
    market: 'USA',
    bodyType: 'Pickup',
    cabType: 'Double Cab',
  },

  // BMW 320i 2019 Europe
  'WBA8E1G50KNU12345': {
    vin: 'WBA8E1G50KNU12345',
    make: 'BMW',
    model: '320i',
    year: 2019,
    generation: 'G20',
    engineCode: 'B48',
    engineSize: '2.0L',
    cylinderCount: 4,
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    driveType: 'RWD',
    market: 'Europe',
    bodyType: 'Sedan',
    cabType: undefined,
  },
};

export const getMockVehicle = (vin: string): VehicleConfiguration | null => {
  const normalized = vin.toUpperCase().replace(/\s+/g, '');
  return mockVehicles[normalized] || null;
};
