
import { accountsService } from './accountsService';
import { journalService } from './journalService';
import { reportService } from './reportService';
import { settingsService } from '../../settings/service';

export const accountingService = {
  ...accountsService,
  ...journalService,
  ...reportService,
  // Fix: Exposed fetchFiscalYears through accountingService for business usecases
  fetchFiscalYears: settingsService.fetchFiscalYears
};