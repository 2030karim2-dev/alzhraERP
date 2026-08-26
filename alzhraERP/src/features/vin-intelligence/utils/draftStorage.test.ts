import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  LEGACY_DRAFT_KEY,
  LEGACY_TEMPLATE_KEY,
  clearDraftRows,
  loadDraftRows,
  loadVehicleTemplate,
  saveDraftRows,
  saveVehicleTemplate,
  scopedKey,
} from './draftStorage';

type Store = Map<string, string>;

describe('draftStorage (per-tenant localStorage)', () => {
  let store: Store;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => {
        const value = store.get(k);
        return value ?? null;
      },
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('scopedKey', () => {
    it('namespaces the key by company id', () => {
      expect(scopedKey(LEGACY_DRAFT_KEY, 'company-a')).toBe(`${LEGACY_DRAFT_KEY}::company-a`);
    });

    it('falls back to the bare base when no company id is available', () => {
      expect(scopedKey(LEGACY_DRAFT_KEY)).toBe(LEGACY_DRAFT_KEY);
      expect(scopedKey(LEGACY_DRAFT_KEY, null)).toBe(LEGACY_DRAFT_KEY);
      expect(scopedKey(LEGACY_DRAFT_KEY, '   ')).toBe(LEGACY_DRAFT_KEY);
    });
  });

  describe('loadDraftRows / saveDraftRows / clearDraftRows', () => {
    it('round-trips rows for a tenant', () => {
      saveDraftRows('co-1', [{ _id: 'r1' }, { _id: 'r2' }]);
      expect(loadDraftRows<{ _id: string }>('co-1')).toEqual([{ _id: 'r1' }, { _id: 'r2' }]);
    });

    it('isolates drafts between tenants sharing the browser', () => {
      saveDraftRows('co-1', [{ secret: 'prices-co-1' }]);
      saveDraftRows('co-2', [{ secret: 'prices-co-2' }]);
      expect(loadDraftRows('co-1')).toEqual([{ secret: 'prices-co-1' }]);
      expect(loadDraftRows('co-2')).toEqual([{ secret: 'prices-co-2' }]);
    });

    it('clearing one tenant leaves other tenants untouched', () => {
      saveDraftRows('co-1', [{ x: 1 }]);
      saveDraftRows('co-2', [{ x: 2 }]);
      clearDraftRows('co-1');
      expect(loadDraftRows('co-1')).toEqual([]);
      expect(loadDraftRows('co-2')).toEqual([{ x: 2 }]);
    });

    it('saving an empty array clears the stored draft', () => {
      saveDraftRows('co-1', [{ x: 1 }]);
      saveDraftRows('co-1', []);
      expect(store.has(`${LEGACY_DRAFT_KEY}::co-1`)).toBe(false);
      expect(loadDraftRows('co-1')).toEqual([]);
    });

    it('returns [] for corrupted JSON instead of crashing', () => {
      store.set(`${LEGACY_DRAFT_KEY}::co-bad`, '{not-json');
      expect(loadDraftRows('co-bad')).toEqual([]);
    });

    it('never reads the legacy unscoped key (no cross-tenant backflow)', () => {
      store.set(LEGACY_DRAFT_KEY, JSON.stringify([{ leaked: true }]));
      expect(loadDraftRows('co-fresh')).toEqual([]);
      expect(store.get(LEGACY_DRAFT_KEY)).toBeDefined();
    });
  });

  describe('loadVehicleTemplate / saveVehicleTemplate', () => {
    it('persists and loads per tenant', () => {
      saveVehicleTemplate('co-1', 'كورولا 2001-2007 خليجي');
      expect(loadVehicleTemplate('co-1')).toBe('كورولا 2001-2007 خليجي');
    });

    it('isolates templates between tenants', () => {
      saveVehicleTemplate('co-1', 'فيتز 2005');
      saveVehicleTemplate('co-2', 'هايلوكس 2010');
      expect(loadVehicleTemplate('co-1')).toBe('فيتز 2005');
      expect(loadVehicleTemplate('co-2')).toBe('هايلوكس 2010');
    });

    it('returns the fallback when nothing was saved', () => {
      expect(loadVehicleTemplate('co-none', 'افتراضي')).toBe('افتراضي');
      expect(loadVehicleTemplate(undefined)).toBe('');
    });

    it('ignores whitespace-only templates', () => {
      saveVehicleTemplate('co-1', '   ');
      expect(loadVehicleTemplate('co-1', 'fallback')).toBe('fallback');
      expect(store.get(`${LEGACY_TEMPLATE_KEY}::co-1`)).toBeUndefined();
    });
  });
});