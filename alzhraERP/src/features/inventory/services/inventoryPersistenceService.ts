import { logger } from '../../../core/utils/logger';
/**
 * InventoryPersistenceService - Handles saving/restoring inventory session drafts
 *
 * Provides three-layer persistence:
 * 1. React State (immediate)
 * 2. sessionStorage (survives navigation/reloads within tab)
 * 3. Server drafts (survives crashes, device changes)
 */

const STORAGE_KEY = 'inventory_session_draft';
const SAVE_DEBOUNCE_MS = 500;
const SERVER_SAVE_THROTTLE_MS = 5000;

interface InventorySessionDraft {
  sessionId: string;
  warehouseId?: string;
  items: Array<{
    productId: string;
    countedQuantity: number | null;
    timestamp: number;
    synced: boolean;
  }>;
  lastSavedAt: number;
  isDirty: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

class InventoryPersistenceService {
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private lastServerSave = 0;
  private statusListeners: Array<(status: SaveStatus) => void> = [];
  private _status: SaveStatus = 'idle';

  get status(): SaveStatus {
    return this._status;
  }

  private setStatus(status: SaveStatus) {
    this._status = status;
    // Defer listener notifications to the next macrotask to prevent
    // React error #321 (setState during render) when listeners are
    // React state setters triggered from async chains in effects.
    setTimeout(() => {
      this.statusListeners.forEach(listener => listener(status));
    }, 0);
  }

  subscribe(listener: (status: SaveStatus) => void) {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  private getStorageKey(sessionId: string): string {
    return sessionId ? `inventory_session_draft_${sessionId}` : STORAGE_KEY;
  }

  /**
   * Synchronous immediate save to sessionStorage (for page unmount / navigation)
   */
  saveLocalSync(draft: InventorySessionDraft) {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }

    try {
      const serialized = JSON.stringify({
        ...draft,
        lastSavedAt: Date.now(),
      });
      sessionStorage.setItem(this.getStorageKey(draft.sessionId), serialized);
      sessionStorage.setItem(STORAGE_KEY, serialized);
      this.setStatus('saved');
    } catch (error) {
      logger.error(
        'inventoryPersistenceService',
        'Failed to save synchronously to sessionStorage:',
        error
      );
    }
  }

  /**
   * Debounced save to sessionStorage
   */
  scheduleLocalSave(draft: InventorySessionDraft) {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }

    this.saveDebounceTimer = setTimeout(() => {
      try {
        const serialized = JSON.stringify({
          ...draft,
          lastSavedAt: Date.now(),
        });
        sessionStorage.setItem(this.getStorageKey(draft.sessionId), serialized);
        sessionStorage.setItem(STORAGE_KEY, serialized);
        this.setStatus('saved');
      } catch (error) {
        logger.error('inventoryPersistenceService', 'Failed to save to sessionStorage:', error);
        this.setStatus('error');
      }
    }, SAVE_DEBOUNCE_MS);
  }

  /**
   * Server-side draft save (throttled)
   */
  async saveToServer(draft: InventorySessionDraft): Promise<boolean> {
    // Throttle server saves — only when dirty and outside throttle window
    const now = Date.now();
    if (
      !draft.isDirty ||
      (this.lastServerSave > 0 && now - this.lastServerSave < SERVER_SAVE_THROTTLE_MS)
    ) {
      return false;
    }

    this.setStatus('saving');

    try {
      const { supabase } = await import('../../../lib/supabaseClient');

      const { error } = await supabase.from('inventory_session_drafts').upsert(
        {
          session_id: draft.sessionId,
          warehouse_id: draft.warehouseId || null,
          items: draft.items,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'session_id' }
      );

      if (error) throw error;

      this.lastServerSave = now;
      this.setStatus('saved');

      // Update local draft to reflect sync
      const updatedDraft = {
        ...draft,
        isDirty: false,
        lastSavedAt: now,
      };
      sessionStorage.setItem(this.getStorageKey(draft.sessionId), JSON.stringify(updatedDraft));
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDraft));

      return true;
    } catch (error) {
      logger.error('inventoryPersistenceService', 'Failed to save draft to server:', error);
      this.setStatus('error');
      return false;
    }
  }

  /**
   * Restore session from sessionStorage or server
   */
  async restoreSession(sessionId: string): Promise<InventorySessionDraft | null> {
    // 1. Try session-specific sessionStorage first (fastest, no network)
    try {
      const specificKeyData = sessionStorage.getItem(this.getStorageKey(sessionId));
      if (specificKeyData) {
        const parsed = JSON.parse(specificKeyData) as InventorySessionDraft;
        if (parsed.sessionId === sessionId) {
          this.setStatus('saved');
          return parsed;
        }
      }

      // Fallback to legacy single key
      const localData = sessionStorage.getItem(STORAGE_KEY);
      if (localData) {
        const parsed = JSON.parse(localData) as InventorySessionDraft;
        if (parsed.sessionId === sessionId) {
          this.setStatus('saved');
          return parsed;
        }
      }
    } catch (error) {
      logger.error('inventoryPersistenceService', 'Failed to parse sessionStorage data:', error);
    }

    // 2. Try server draft
    try {
      const { supabase } = await import('../../../lib/supabaseClient');

      const { data, error } = await supabase
        .from('inventory_session_drafts')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();

      if (error || !data) return null;

      const draft: InventorySessionDraft = {
        sessionId: data.session_id,
        ...(data.warehouse_id ? { warehouseId: data.warehouse_id } : {}),
        items: Array.isArray(data.items)
          ? data.items.map((raw: unknown) => {
              const item = raw as Record<string, unknown>;
              let counted: number | null = null;
              if (item.countedQuantity !== undefined && item.countedQuantity !== null) {
                const parsed = Number(item.countedQuantity);
                counted = Number.isNaN(parsed) ? null : parsed;
              } else if (item.counted_quantity !== undefined && item.counted_quantity !== null) {
                const parsed = Number(item.counted_quantity);
                counted = Number.isNaN(parsed) ? null : parsed;
              }
              return {
                productId: String(item.productId || item.product_id || item.id || ''),
                countedQuantity: counted,
                timestamp: typeof item.timestamp === 'number' ? item.timestamp : Date.now(),
                synced: typeof item.synced === 'boolean' ? item.synced : true,
              };
            })
          : [],
        lastSavedAt: new Date(data.updated_at ?? new Date().toISOString()).getTime(),
        isDirty: false,
      };

      // Cache locally for next time
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      this.setStatus('saved');

      return draft;
    } catch (error) {
      logger.error('inventoryPersistenceService', 'Failed to restore from server:', error);
      return null;
    }
  }

  /**
   * Clear session data from all storage layers.
   * Optionally removes the server-side draft to prevent stale restores after finalization.
   */
  clearSession(sessionId?: string) {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }

    try {
      if (sessionId) {
        sessionStorage.removeItem(this.getStorageKey(sessionId));
        localStorage.removeItem(this.getStorageKey(sessionId));
      }
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      logger.error('inventoryPersistenceService', 'Failed to clear session storage:', error);
    }

    this.lastServerSave = 0;
    this.setStatus('idle');

    // Also remove server-side draft so re-entering a completed session
    // doesn't trigger a stale "restored from autosave" message.
    if (sessionId) {
      void this.clearServerDraft(sessionId);
    }
  }

  /**
   * Delete the server-side draft for a session (called after finalization).
   */
  async clearServerDraft(sessionId: string): Promise<void> {
    try {
      const { supabase } = await import('../../../lib/supabaseClient');
      await supabase.from('inventory_session_drafts').delete().eq('session_id', sessionId);
    } catch (error) {
      logger.error('inventoryPersistenceService', 'Failed to clear server draft:', error);
    }
  }

  /**
   * Force immediate save (useful for page unload / beforeunload)
   * Writes to sessionStorage for consistency with restoreSession
   */
  async forceSave(draft: InventorySessionDraft): Promise<void> {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }

    // Save to sessionStorage synchronously (consistent with scheduleLocalSave)
    try {
      const serialized = JSON.stringify({ ...draft, lastSavedAt: Date.now() });
      // Write session-specific key first (matches scheduleLocalSave behaviour)
      sessionStorage.setItem(this.getStorageKey(draft.sessionId), serialized);
      sessionStorage.setItem(STORAGE_KEY, serialized);
    } catch (error) {
      logger.error('inventoryPersistenceService', 'Failed to force save:', error);
    }

    // Try server save
    await this.saveToServer(draft);
  }
}

export const inventoryPersistence = new InventoryPersistenceService();
export type { InventorySessionDraft, SaveStatus };
