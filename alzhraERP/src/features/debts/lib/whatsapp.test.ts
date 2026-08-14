import { describe, it, expect } from 'vitest';
import {
  buildWhatsAppLink,
  hasValidWhatsAppPhone,
  normalizePhoneForWhatsApp,
} from './whatsapp';

describe('whatsapp helpers', () => {
  it('normalizes a phone with spaces and plus signs', () => {
    expect(normalizePhoneForWhatsApp('+967 777 123 456')).toBe('967777123456');
  });

  it('strips the international 00 prefix', () => {
    expect(normalizePhoneForWhatsApp('00967777123456')).toBe('967777123456');
  });

  it('builds a wa.me link with URL-encoded message', () => {
    const link = buildWhatsAppLink('+967 777 123 456', 'مرحباً، لديك دين مستحق');
    expect(link).toContain('https://wa.me/967777123456?text=');
    expect(decodeURIComponent(link.split('text=')[1])).toBe('مرحباً، لديك دين مستحق');
  });

  it('rejects phones shorter than 9 digits', () => {
    expect(hasValidWhatsAppPhone('123456')).toBe(false);
    expect(hasValidWhatsAppPhone('+967 777 123 456')).toBe(true);
    expect(hasValidWhatsAppPhone(null)).toBe(false);
    expect(hasValidWhatsAppPhone(undefined)).toBe(false);
  });
});
