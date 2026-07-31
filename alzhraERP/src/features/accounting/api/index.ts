
// Export individual API modules for granular usage
export * from './accountsApi';
export * from './journalsApi';
export * from './reportsApi';

// Optional: Export a combined object if needed for backward compatibility
import { accountsApi } from './accountsApi';
import { journalsApi } from './journalsApi';
import { reportsApi } from './reportsApi';

export const accountingApi = {
  ...accountsApi,
  ...journalsApi,
  ...reportsApi
};