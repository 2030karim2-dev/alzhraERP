/**
 * Barrel file — maintains backward compatibility.
 * The monolithic `inventoryApi` object is composed from domain-specific sub-modules.
 * 
 * New code should import the specific sub-API directly:
 *   import { productsApi } from './api/productsApi';
 *   import { vehiclesApi } from './api/vehiclesApi';
 */

import { productsApi } from './api/productsApi';
import { warehouseApi } from './api/warehouseApi';
import { vehiclesApi } from './api/vehiclesApi';
import { analyticsApi } from './api/analyticsApi';
import { autoPartsApi } from './api/autoPartsApi';

// Re-export individual APIs for granular imports
export { productsApi, warehouseApi, vehiclesApi, analyticsApi, autoPartsApi };

// Unified object for backward compatibility
export const inventoryApi = {
  ...productsApi,
  ...warehouseApi,
  ...vehiclesApi,
  ...analyticsApi,
  ...autoPartsApi,
};
