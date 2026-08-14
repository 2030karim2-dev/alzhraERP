/**
 * Pure helpers for building WhatsApp wa.me deep links.
 * Display/navigation only — no business logic.
 */

/** Strip everything except digits; drop the international "00" prefix. */
export const normalizePhoneForWhatsApp = (phone: string): string => {
  const digits = phone.replace(/[^\d]/g, '');
  return digits.startsWith('00') ? digits.slice(2) : digits;
};

/** Build a wa.me deep link with a pre-filled, URL-encoded message. */
export const buildWhatsAppLink = (phone: string, message: string): string => {
  const normalized = normalizePhoneForWhatsApp(phone);
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};

/** A phone is usable for WhatsApp when it has at least 9 digits. */
export const hasValidWhatsAppPhone = (phone: string | null | undefined): boolean => {
  if (phone === null || phone === undefined) return false;
  return normalizePhoneForWhatsApp(phone).length >= 9;
};
