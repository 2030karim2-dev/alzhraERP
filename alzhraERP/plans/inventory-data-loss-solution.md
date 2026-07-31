# Inventory Data Loss Prevention - Technical Solution

## Problem Analysis
Data loss occurs when users navigate away from an active inventory session, causing all entered quantities to disappear. This happens because the current implementation likely stores data only in component-level state without persistence mechanisms.

---

## 1. Data Persistence Strategies Comparison

### 1.1 Client-Side Persistence

#### A. localStorage
- **Capacity:** ~5-10MB per domain
- **Persistence:** Survives browser restarts, cleared only manually
- **Best for:** Critical session data that must survive crashes
- **Limitations:** Synchronous API, limited capacity, string-only storage

#### B. sessionStorage
- **Capacity:** ~5MB per domain
- **Persistence:** Cleared when tab/window closes
- **Best for:** Temporary data for current session only
- **Limitations:** Lost on browser close, string-only storage

#### C. IndexedDB
- **Capacity:** Hundreds of MB to GB
- **Persistence:** Permanent until explicitly cleared
- **Best for:** Large datasets, complex queries
- **Advantages:** Async API, supports structured data, transactions
- **Limitations:** More complex API

### 1.2 State Management

#### Options:
- **React Context + useReducer:** Built-in, no dependencies
- **Zustand:** Lightweight, already in project
- **Redux Toolkit:** Overkill for this use case
- **React Query:** Good for server state, not ideal for local drafts

**Recommendation:** Use Zustand (already in project) + React Context for session persistence across navigation.

### 1.3 Server-Side Persistence

#### A. Draft Records in Database
- Create `inventory_session_drafts` table
- Auto-save every N seconds or on each change
- Survives device changes/browser crashes
- Requires backend API implementation

#### B. Optimistic UI with Background Sync
- Immediate local update
- Background sync with server
- Conflict resolution for multi-user scenarios

**Recommendation:** Combine client-side (Zustand + sessionStorage) + server-side draft saves for maximum reliability.

---

## 2. Recommended Solution Architecture

### 2.1 Three-Layer Persistence Strategy

```
Layer 1: Immediate UI State (React State)
    ↓ auto-save on change (debounced)
Layer 2: Session Storage (sessionStorage)
    ↓ persists across navigation within tab
Layer 3: Server Drafts (Database)
    ↓ persists across browsers/devices/crashes
```

### 2.2 Implementation Logic Flow

```
┌─────────────────────────────────────────────────┐
│ User enters quantity in inventory session       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ Update React State (immediate UI feedback)       │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ Debounced Save (500ms-1000ms delay)             │
│ - Write to sessionStorage                       │
│ - Trigger server draft update (every 5s max)    │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ On Navigation/Rerender:                         │
│ 1. Check for active session in state            │
│ 2. Restore from sessionStorage if empty         │
│ 3. Restore from server draft if no local data   │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│ On Page Load:                                   │
│ 1. Check sessionStorage                        │
│ 2. Check server drafts (async)                  │
│ 3. Merge both sources (server wins conflicts)   │
└─────────────────────────────────────────────────┘
```

---

## 3. High-Level Implementation Logic

### 3.1 Data Structure

```typescript
interface InventorySessionDraft {
  sessionId: string;
  warehouseId: string;
  items: Array<{
    productId: string;
    countedQuantity: number;
    timestamp: number;
    synced: boolean;
  }>;
  lastSavedAt: number;
  isDirty: boolean;
}
```

### 3.2 Zustand Store Enhancement

```typescript
interface InventorySessionState {
  // Current session
  sessionId: string | null;
  items: Map<string, number>; // productId -> quantity
  
  // Persistence status
  isDirty: boolean;
  lastSavedAt: number | null;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  
  // Actions
  updateQuantity: (productId: string, quantity: number) => void;
  restoreFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  clearSession: () => void;
}
```

### 3.3 Persistence Service

```typescript
class InventoryPersistenceService {
  private storageKey = 'inventory_session_draft';
  private saveDebounceTimer: NodeJs.Timeout | null = null;
  
  // Debounced save to sessionStorage
  scheduleLocalSave(data: InventorySessionDraft) {
    clearTimeout(this.saveDebounceTimer);
    this.saveDebounceTimer = setTimeout(() => {
      sessionStorage.setItem(this.storageKey, JSON.stringify(data));
    }, 500);
  }
  
  // Server-side draft save (throttled)
  async saveToServer(data: InventorySessionDraft) {
    // Only save if dirty and last save > 5s ago
    if (!data.isDirty || 
        (data.lastSavedAt && Date.now() - data.lastSavedAt < 5000)) {
      return;
    }
    
    // Optimistic update
    this.updateSaveStatus('saving');
    
    try {
      await supabase
        .from('inventory_session_drafts')
        .upsert({
          session_id: data.sessionId,
          warehouse_id: data.warehouseId,
          items: data.items,
          updated_at: new Date().toISOString()
        });
      
      this.updateSaveStatus('saved');
    } catch (error) {
      this.updateSaveStatus('error');
      // Queue for retry
    }
  }
  
  // Restore logic
  async restoreSession(sessionId: string): Promise<InventorySessionDraft | null> {
    // 1. Try sessionStorage first (fastest)
    const localData = sessionStorage.getItem(this.storageKey);
    if (localData) {
      return JSON.parse(localData);
    }
    
    // 2. Try server draft
    const { data } = await supabase
      .from('inventory_session_drafts')
      .select('*')
      .eq('session_id', sessionId)
      .single();
    
    if (data) {
      // Restore to sessionStorage for next time
      sessionStorage.setItem(this.storageKey, JSON.stringify(data));
      return data;
    }
    
    return null;
  }
}
```

### 3.4 React Hook Integration

```typescript
export function useInventorySession(sessionId: string) {
  const store = useInventorySessionStore();
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Restore on mount
  useEffect(() => {
    let mounted = true;
    
    async function restore() {
      if (!mounted) return;
      setIsRestoring(true);
      
      const draft = await persistenceService.restoreSession(sessionId);
      if (draft && mounted) {
        store.restoreFromDraft(draft);
      }
      
      setIsRestoring(false);
    }
    
    restore();
    
    // Auto-save on unmount
    return () => {
      mounted = false;
      if (store.isDirty) {
        persistenceService.saveToServer(store.getDraft());
      }
    };
  }, [sessionId]);
  
  // Debounced save on data change
  const updateQuantity = useCallback((productId: string, quantity: number) => {
    store.updateQuantity(productId, quantity);
    
    const draft = store.getDraft();
    persistenceService.scheduleLocalSave(draft);
    persistenceService.saveToServer(draft);
  }, [store]);
  
  return { updateQuantity, isRestoring };
}
```

---

## 4. Best Practices

### 4.1 Handling Unsaved Changes
- **Warning dialogs:** Prompt user before navigating if `isDirty === true`
- **Auto-save indicators:** Show save status (saving.../saved/error)
- **Offline support:** Queue saves when offline, retry when online

### 4.2 Conflict Resolution
- Use last-write-wins for single-user sessions
- Implement operational transforms for multi-user (if needed)
- Timestamp-based merging (server authoritative)

### 4.3 Error Recovery
- Retry failed saves with exponential backoff
- Queue system for offline support
- Clear error messages with retry actions

### 4.4 Performance Optimization
- Debounce localStorage writes (500ms)
- Throttle server saves (5s minimum interval)
- Use Web Workers for large datasets
- Batch updates for multiple items

---

## 5. Database Schema Changes

### 5.1 New Table: `inventory_session_drafts`

```sql
CREATE TABLE inventory_session_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  warehouse_id TEXT NOT NULL,
  items JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(session_id)
);

-- Index for fast lookups
CREATE INDEX idx_inventory_drafts_session 
ON inventory_session_drafts(session_id);

-- Auto-cleanup old drafts (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_drafts()
RETURNS void AS $$
BEGIN
  DELETE FROM inventory_session_drafts
  WHERE updated_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
```

### 5.2 Migration for Existing Audit Sessions

```sql
-- Add draft fields to existing sessions
ALTER TABLE audit_sessions ADD COLUMN IF NOT EXISTS has_draft BOOLEAN DEFAULT false;
ALTER TABLE audit_sessions ADD COLUMN IF NOT EXISTS draft_saved_at TIMESTAMP;
```

---

## 6. Implementation Checklist

- [ ] Create `InventoryPersistenceService` class
- [ ] Enhance Zustand store with persistence actions
- [ ] Implement `useInventorySession` hook with auto-save
- [ ] Add sessionStorage JSON serialization
- [ ] Create `inventory_session_drafts` database table
- [ ] Implement server-side draft API endpoint
- [ ] Add network status detection for offline mode
- [ ] Implement retry queue for failed saves
- [ ] Add unsaved changes warning before navigation
- [ ] Write tests for persistence logic
- [ ] Add monitoring/logging for save operations
- [ ] Implement cleanup job for old drafts

---

## 7. Alternative: Minimal-Implementation Approach

If full server-side persistence is too complex for immediate implementation:

1. **Immediate:** Use Zustand + sessionStorage only
2. **Benefits:** Survives navigation, survives page reloads, survives accidental closes within same browser
3. **Limitations:** Lost on browser close, not synced across devices
4. **Migration path:** Can add server persistence later without changing UI logic

---

## Conclusion

**Recommended Stack:**
- **Client:** Zustand (existing) + sessionStorage
- **Server:** Supabase `inventory_session_drafts` table
- **Sync:** Debounced auto-save + manual save on navigation
- **Fallback:** sessionStorage if server unreachable

This ensures data survives:
- ✅ Navigation between items
- ✅ Page reloads
- ✅ Browser crashes
- ✅ Accidental tab closure (within session)
- ✅ Device switches (via server drafts)
- ✅ Offline work (queue + sync)

**Priority:** Implement client-side solution first (sessionStorage), then add server drafts for production reliability.