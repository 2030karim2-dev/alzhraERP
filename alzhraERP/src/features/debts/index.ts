/**
 * Debt & Collection module — public entry point.
 * Pages import from here; the module is isolated behind its own routes.
 */
export * from './types';
export { debtApi, debtMessageApi, DEBT_ENGINE_DEFAULTS } from './api/debtApi';
export { debtsService, type PreparedReminder } from './services/debtService';
export { useDebtMutations } from './hooks/useDebtMutations';
export * from './hooks/useDebtQueries';
export * from './lib/constants';
export { buildWhatsAppLink, hasValidWhatsAppPhone, normalizePhoneForWhatsApp } from './lib/whatsapp';
export { renderReminderTemplate, TEMPLATE_PLACEHOLDERS, type ReminderMessageContext } from './lib/messageTemplate';
