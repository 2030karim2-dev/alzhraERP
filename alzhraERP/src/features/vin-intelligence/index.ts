/**
 * VIN Intelligence — Comprehensive Modular Feature Entrypoint
 */

// Types & Contracts
export * from './types';

// Validation & Normalization Utils
export { validateVin, MIN_VIN_LENGTH, MAX_VIN_LENGTH } from './utils/vinValidator';
export { preDecodeVin } from './utils/wmiDecoder';
export { parseCatalogVehicleText } from './utils/catalogTextExtractor';
export {
  generateSmartPartName,
  getArabicVehicleName,
  formatVehicleYears,
} from './utils/smartPartNamer';
export {
  exportPartsToExcel,
  parsePartsFromFile,
  parseBulkPartsText,
  formatPartsForWhatsApp,
} from './utils/partsExcelHelper';

// API & Services
export { vinApi } from './api';
export { vinService } from './services/vinService';
export { partIntelligenceService } from './services/partIntelligenceService';

// Hooks
export { useVinIntelligence } from './hooks/useVinIntelligence';
export { usePartInspection } from './hooks/usePartInspection';

// Components
export * from './components';

// Pages
export { default as VINPage } from './pages/VINPage';
