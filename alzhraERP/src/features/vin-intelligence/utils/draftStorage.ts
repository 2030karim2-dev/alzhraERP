/**
 * Per-tenant localStorage for VIN-extract drafts & naming templates.
 *
 * Audit fix (P1-M2): the previously-fixed keys
 * (`alz_vin_extract_draft_rows`, `alz_vin_extract_custom_template`)
 * leaked commercial data — purchase prices included — across tenants
 * sharing one browser profile. Every key is now suffixed with the
 * ACTIVE company_id.
 *
 * Pre-existing unscoped drafts are intentionally NOT migrated: their
 * owning tenant cannot be determined reliably, and copying them into
 * whichever tenant happens to open the page next would replicate the
 * very leak this fixes. Drafts are transient scratchpads — losing one
 * beats leaking it.
 */

const DRAFT_KEY_BASE = 'alz_vin_extract_draft_rows';
const TEMPLATE_KEY_BASE = 'alz_vin_extract_custom_template';

/** Legacy (pre-fix) unscoped keys — exposed for reference and tests. */
export const LEGACY_DRAFT_KEY = DRAFT_KEY_BASE;
export const LEGACY_TEMPLATE_KEY = TEMPLATE_KEY_BASE;

/** `'<base>::<companyId>'` when a tenant context exists, bare base otherwise. */
export function scopedKey(base: string, companyId?: string | null): string {
  const id = (companyId ?? '').trim();
  return id ? `${base}::${id}` : base;
}

function readJson(key: string): unknown {
  let raw: string | null;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null; // privacy mode / blocked storage
  }
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null; // corrupted row must never crash the page (mirror vehicleGuard policy)
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded / privacy mode — persistence is best-effort */
  }
}

function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function loadDraftRows<T = unknown>(companyId?: string | null): T[] {
  const rows = readJson(scopedKey(DRAFT_KEY_BASE, companyId));
  return Array.isArray(rows) ? (rows as T[]) : [];
}

/** Persists rows; passing an empty array clears the stored draft entirely. */
export function saveDraftRows(companyId: string | null | undefined, rows: readonly unknown[]): void {
  const key = scopedKey(DRAFT_KEY_BASE, companyId);
  if (rows.length === 0) {
    removeKey(key);
    return;
  }
  writeJson(key, rows);
}

export function clearDraftRows(companyId: string | null | undefined): void {
  removeKey(scopedKey(DRAFT_KEY_BASE, companyId));
}

/** Reads the tenant-scoped naming template, falling back to `fallback`. */
export function loadVehicleTemplate(
  companyId: string | null | undefined,
  fallback = '',
): string {
  let saved: string | null;
  try {
    saved = localStorage.getItem(scopedKey(TEMPLATE_KEY_BASE, companyId));
  } catch {
    return fallback; // privacy mode / blocked storage
  }
  const trimmed = saved?.trim();
  if (trimmed !== undefined && trimmed.length > 0) return saved;
  return fallback;
}

/** Persists the template; empty/whitespace values are ignored (legacy behavior). */
export function saveVehicleTemplate(
  companyId: string | null | undefined,
  template: string,
): void {
  if (!template.trim()) return;
  try {
    localStorage.setItem(scopedKey(TEMPLATE_KEY_BASE, companyId), template);
  } catch {
    /* ignore */
  }
}