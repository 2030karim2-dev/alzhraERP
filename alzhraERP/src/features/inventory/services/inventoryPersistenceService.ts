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
    private saveDebounceTimer: NodeJS.Timeout | null = null;
    private lastServerSave = 0;
    private statusListeners: Array<(status: SaveStatus) => void> = [];
    private _status: SaveStatus = 'idle';

    get status(): SaveStatus {
        return this._status;
    }

    private setStatus(status: SaveStatus) {
        this._status = status;
        this.statusListeners.forEach(listener => listener(status));
    }

    subscribe(listener: (status: SaveStatus) => void) {
        this.statusListeners.push(listener);
        return () => {
            this.statusListeners = this.statusListeners.filter(l => l !== listener);
        };
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
                    lastSavedAt: Date.now()
                });
                sessionStorage.setItem(STORAGE_KEY, serialized);
                this.setStatus('saved');
            } catch (error) {
                console.error('Failed to save to sessionStorage:', error);
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
        if (!draft.isDirty || (this.lastServerSave > 0 && now - this.lastServerSave < SERVER_SAVE_THROTTLE_MS)) {
            return false;
        }

        this.setStatus('saving');

        try {
            const { supabase } = await import('../../../lib/supabaseClient');

            const { error } = await supabase
                .from('inventory_session_drafts')
                .upsert({
                    session_id: draft.sessionId,
                    warehouse_id: draft.warehouseId || null,
                    items: draft.items,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            this.lastServerSave = now;
            this.setStatus('saved');

            // Update local draft to reflect sync
            const updatedDraft = {
                ...draft,
                isDirty: false,
                lastSavedAt: now
            };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDraft));

            return true;
        } catch (error) {
            console.error('Failed to save draft to server:', error);
            this.setStatus('error');
            return false;
        }
    }

    /**
     * Restore session from sessionStorage or server
     */
    async restoreSession(sessionId: string): Promise<InventorySessionDraft | null> {
        // 1. Try sessionStorage first (fastest, no network)
        try {
            const localData = sessionStorage.getItem(STORAGE_KEY);
            if (localData) {
                const parsed = JSON.parse(localData) as InventorySessionDraft;
                if (parsed.sessionId === sessionId) {
                    this.setStatus('saved');
                    return parsed;
                }
            }
        } catch (error) {
            console.error('Failed to parse sessionStorage data:', error);
        }

        // 2. Try server draft
        try {
            const { supabase } = await import('../../../lib/supabaseClient');

            const { data, error } = await supabase
                .from('inventory_session_drafts')
                .select('*')
                .eq('session_id', sessionId)
                .single();

            if (error || !data) return null;

            const draft: InventorySessionDraft = {
                sessionId: data.session_id,
                warehouseId: data.warehouse_id || undefined,
                items: Array.isArray(data.items) ? data.items : [],
                lastSavedAt: new Date(data.updated_at).getTime(),
                isDirty: false
            };

            // Cache locally for next time
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
            this.setStatus('saved');

            return draft;
        } catch (error) {
            console.error('Failed to restore from server:', error);
            return null;
        }
    }

    /**
     * Clear session data from all storage layers
     */
    clearSession() {
        if (this.saveDebounceTimer) {
            clearTimeout(this.saveDebounceTimer);
            this.saveDebounceTimer = null;
        }

        try {
            sessionStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear session storage:', error);
        }

        this.lastServerSave = 0;
        this.setStatus('idle');
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
            sessionStorage.setItem(STORAGE_KEY, serialized);
        } catch (error) {
            console.error('Failed to force save:', error);
        }

        // Try server save
        await this.saveToServer(draft);
    }
}

export const inventoryPersistence = new InventoryPersistenceService();
export type { InventorySessionDraft, SaveStatus };