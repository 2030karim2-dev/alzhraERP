
/**
 * Local Database Engine
 * This mimics a database by storing data in LocalStorage.
 * It ensures data persistence across refreshes without external APIs.
 */

const DB_PREFIX = 'alz_erp_';

/** Minimal base shape for all local-DB records */
interface BaseRecord extends Record<string, unknown> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}

export const localDB = {
  // Helper to get full table data
  getTable: <T>(tableName: string): T[] => {
    try {
      const data = localStorage.getItem(`${DB_PREFIX}${tableName}`);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('LocalDB Read Error:', e);
      return [];
    }
  },

  // Helper to save full table data
  saveTable: <T>(tableName: string, data: T[]) => {
    try {
      localStorage.setItem(`${DB_PREFIX}${tableName}`, JSON.stringify(data));
    } catch (e) {
      console.error('LocalDB Write Error:', e);
    }
  },

  // Simulate SELECT * FROM table
  select: async (tableName: string) => {
    const data = localDB.getTable(tableName);
    // Simulate network delay for realism
    await new Promise(r => setTimeout(r, 100));
    return { data, error: null };
  },

  // Simulate INSERT INTO table
  insert: async (tableName: string, row: BaseRecord) => {
    const table = localDB.getTable(tableName);
    const newRow = { 
        id: row.id || crypto.randomUUID(), 
        created_at: new Date().toISOString(), 
        ...row 
    };
    table.unshift(newRow); // Add to top
    localDB.saveTable(tableName, table);
    await new Promise(r => setTimeout(r, 200));
    return { data: newRow, error: null };
  },

  // Simulate UPDATE table
  update: async (tableName: string, id: string, updates: BaseRecord) => {
    const table = localDB.getTable<any>(tableName);
    const index = table.findIndex(r => r.id === id);
    if (index !== -1) {
      table[index] = { ...table[index], ...updates, updated_at: new Date().toISOString() };
      localDB.saveTable(tableName, table);
      return { data: table[index], error: null };
    }
    return { data: null, error: { message: 'Not found' } };
  },

  // Simulate DELETE FROM table
  delete: async (tableName: string, id: string) => {
    const table = localDB.getTable<any>(tableName);
    const newTable = table.filter(r => r.id !== id);
    localDB.saveTable(tableName, newTable);
    return { error: null };
  },

  // Simulate RPC calls (Custom Logic)
  rpc: async (functionName: string, params: Record<string, unknown>) => {
    await new Promise(r => setTimeout(r, 100));
    
    // Logic for generating next invoice number
    if (functionName === 'get_next_number') {
        const table = params.p_entity_type === 'sale' ? 'invoices' : 'purchases';
        const records = localDB.getTable<any>(table);
        const count = records.length + 1;
        const prefix = params.p_entity_type === 'sale' ? 'INV' : 'PUR';
        return { data: `${prefix}-${String(count).padStart(5, '0')}`, error: null };
    }

    return { data: null, error: null };
  },
  
  // Specific query helpers used in the app
  match: (tableName: string, filter: Record<string, unknown>) => {
      const table = localDB.getTable<any>(tableName);
      const filtered = table.filter(row => {
          return Object.entries(filter).every(([key, value]) => row[key] === value);
      });
      return { data: filtered, error: null };
  }
};
