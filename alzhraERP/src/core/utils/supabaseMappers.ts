import { Database } from '../database.types';

export type DbTables = Database['public']['Tables'];

/**
 * Utility to ensure the payload strictly matches the Insert type of the given table.
 * Strips out `undefined` values which can sometimes cause issues with Supabase updates.
 */
export function mapToInsert<T extends keyof DbTables>(
    payload: DbTables[T]['Insert']
): DbTables[T]['Insert'] {
    // In a full reflection setup we would strip unknown keys here.
    // For now, we rely on TypeScript's strict typing to prevent extra keys,
    // and we clean up undefined values to be safe.
    const cleanPayload = { ...payload };
    Object.keys(cleanPayload).forEach(key => {
        if ((cleanPayload as any)[key] === undefined) {
            delete (cleanPayload as any)[key];
        }
    });
    return cleanPayload;
}

/**
 * Utility to ensure the payload strictly matches the Update type of the given table.
 */
export function mapToUpdate<T extends keyof DbTables>(
    payload: DbTables[T]['Update']
): DbTables[T]['Update'] {
    const cleanPayload = { ...payload };
    Object.keys(cleanPayload).forEach(key => {
        if ((cleanPayload as any)[key] === undefined) {
            delete (cleanPayload as any)[key];
        }
    });
    return cleanPayload;
}
