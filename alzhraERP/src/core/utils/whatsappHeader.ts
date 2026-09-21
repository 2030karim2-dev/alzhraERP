/* eslint-disable complexity, @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain */
import type { WhatsappHeaderConfig } from '../types/documentHeader';

export interface CompanyHeaderSource {
  name: string;
  slogan?: string | undefined;
  phone?: string | undefined;
  taxNumber?: string | undefined;
  address?: string | undefined;
}

export function buildWhatsappHeader(
  config: WhatsappHeaderConfig,
  company: CompanyHeaderSource
): string {
  const parts: string[] = [];

  // Greeting
  if (config.customGreeting && config.customGreeting.trim()) {
    parts.push(config.customGreeting.trim());
  }

  // Company Name
  if (config.includeCompanyName && company.name) {
    parts.push(`🏢 *${company.name.trim()}*`);
  }

  // Slogan
  if (config.includeSlogan && company.slogan && company.slogan.trim()) {
    parts.push(`✨ _${company.slogan.trim()}_`);
  }

  // Contact
  if (config.includeContact && company.phone && company.phone.trim()) {
    parts.push(`📞 هاتف: ${company.phone.trim()}`);
  }

  // Tax number
  if (config.includeTaxNumber && company.taxNumber && company.taxNumber.trim()) {
    parts.push(`📋 الرقم الضريبي: ${company.taxNumber.trim()}`);
  }

  // Divider
  let divider = '';
  switch (config.dividerStyle) {
    case 'stars':
      divider = '━━━━━━━━━━━━━━━━━━━━━━';
      break;
    case 'dashes':
      divider = '----------------------';
      break;
    case 'emojis':
      divider = '🔹 🔹 🔹 🔹 🔹 🔹 🔹';
      break;
    case 'none':
    default:
      divider = '';
      break;
  }

  if (divider && parts.length > 0) {
    parts.push(divider);
  }

  return parts.length > 0 ? parts.join('\n') + '\n\n' : '';
}
