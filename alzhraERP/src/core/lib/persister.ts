// ============================================
// نظام التخزين المحلي (Persister)
// Local Storage Persistence System
// ============================================

import { STORAGE_KEYS } from '../constants';
import { logger } from '../utils/logger';

// ------------------------------------------
// Storage Types
// ------------------------------------------
type StorageValue = string | number | boolean | object | null;

interface StorageOptions {
    expires?: number; // milliseconds
    prefix?: string;
}

// ------------------------------------------
// Storage Adapter
// ------------------------------------------
class StorageAdapter {
    private prefix: string = 'alzhra_';

    setPrefix(prefix: string): void {
        this.prefix = prefix;
    }

    private getKey(key: string): string {
        return `${this.prefix}${key}`;
    }

    // ------------------------------------------
    // Basic Operations
    // ------------------------------------------
    set(key: string, value: StorageValue, options?: StorageOptions): void {
        try {
            const finalKey = this.getKey(key);
            let storageValue: string;

            if (typeof value === 'object' && value !== null) {
                const payload = {
                    data: value,
                    timestamp: Date.now(),
                    expires: options?.expires,
                };
                storageValue = JSON.stringify(payload);
            } else {
                storageValue = String(value);
            }

            localStorage.setItem(finalKey, storageValue);
        } catch (error) {
            logger.error('Persister', 'Storage set error', error);
        }
    }

    get<T = StorageValue>(key: string, defaultValue?: T): T | undefined {
        try {
            const finalKey = this.getKey(key);
            const item = localStorage.getItem(finalKey);

            if (item === null) {
                return defaultValue;
            }

            // Try to parse as JSON
            try {
                const parsed = JSON.parse(item);

                // Check if it's a complex object with expiry
                if (parsed && typeof parsed === 'object' && 'expires' in parsed) {
                    if (parsed.expires && Date.now() > parsed.expires) {
                        this.remove(key);
                        return defaultValue;
                    }
                    return parsed.data as T;
                }

                return parsed as T;
            } catch {
                // Return as primitive
                return item as unknown as T;
            }
        } catch (error) {
            logger.error('Persister', 'Storage get error', error);
            return defaultValue;
        }
    }

    remove(key: string): void {
        try {
            const finalKey = this.getKey(key);
            localStorage.removeItem(finalKey);
        } catch (error) {
            logger.error('Persister', 'Storage remove error', error);
        }
    }

    clear(): void {
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));
        } catch (error) {
            logger.error('Persister', 'Storage clear error', error);
        }
    }

    // ------------------------------------------
    // Utility Methods
    // ------------------------------------------
    has(key: string): boolean {
        return this.get(key) !== undefined;
    }

    keys(): string[] {
        const keys: string[] = [];
        const prefix = this.getKey('');

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) {
                keys.push(key.replace(prefix, ''));
            }
        }

        return keys;
    }

    size(): number {
        let size = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.prefix)) {
                const item = localStorage.getItem(key);
                if (item) {
                    size += item.length;
                }
            }
        }
        return size;
    }
}

// ------------------------------------------
// Session Storage Adapter
// ------------------------------------------
class SessionStorageAdapter {
    private prefix: string = 'alzhra_';

    setPrefix(prefix: string): void {
        this.prefix = prefix;
    }

    private getKey(key: string): string {
        return `${this.prefix}${key}`;
    }

    set(key: string, value: StorageValue): void {
        try {
            const finalKey = this.getKey(key);
            const storageValue = typeof value === 'object'
                ? JSON.stringify(value)
                : String(value);
            sessionStorage.setItem(finalKey, storageValue);
        } catch (error) {
            logger.error('Persister', 'Session storage set error', error);
        }
    }

    get<T = StorageValue>(key: string, defaultValue?: T): T | undefined {
        try {
            const finalKey = this.getKey(key);
            const item = sessionStorage.getItem(finalKey);

            if (item === null) {
                return defaultValue;
            }

            try {
                return JSON.parse(item) as T;
            } catch {
                return item as unknown as T;
            }
        } catch (error) {
            logger.error('Persister', 'Session storage get error', error);
            return defaultValue;
        }
    }

    remove(key: string): void {
        try {
            const finalKey = this.getKey(key);
            sessionStorage.removeItem(finalKey);
        } catch (error) {
            logger.error('Persister', 'Session storage remove error', error);
        }
    }

    clear(): void {
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key?.startsWith(this.prefix)) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => sessionStorage.removeItem(key));
        } catch (error) {
            logger.error('Persister', 'Session storage clear error', error);
        }
    }
}

// ------------------------------------------
// Export Instances
// ------------------------------------------
export const localStorage$ = new StorageAdapter();
export const sessionStorage$ = new SessionStorageAdapter();

// ------------------------------------------
// Base Persister Functions
// ------------------------------------------
export const persisterBase = {
    set: (key: string, value: StorageValue, options?: StorageOptions) => localStorage$.set(key, value, options),
    get: <T = StorageValue>(key: string, defaultValue?: T) => localStorage$.get<T>(key, defaultValue),
    remove: (key: string) => localStorage$.remove(key),
    clear: () => localStorage$.clear(),
    has: (key: string) => localStorage$.has(key),
    keys: () => localStorage$.keys(),
};

// ------------------------------------------
// Specialized Storage Methods
// ------------------------------------------
export const persister = {
    // Auth
    auth: {
        setToken(token: string): void {
            persisterBase.set(STORAGE_KEYS.AUTH_TOKEN, token, { expires: 7 * 24 * 60 * 60 * 1000 }); // 7 days
        },
        getToken(): string | undefined {
            return persisterBase.get<string>(STORAGE_KEYS.AUTH_TOKEN);
        },
        removeToken(): void {
            persisterBase.remove(STORAGE_KEYS.AUTH_TOKEN);
        },
        setUser(user: object): void {
            persisterBase.set(STORAGE_KEYS.USER_DATA, user);
        },
        getUser<T = object>(): T | undefined {
            return persisterBase.get<T>(STORAGE_KEYS.USER_DATA);
        },
        clear(): void {
            persisterBase.remove(STORAGE_KEYS.AUTH_TOKEN);
            persisterBase.remove(STORAGE_KEYS.USER_DATA);
        },
    },

    // Company
    company: {
        set(company: object): void {
            persisterBase.set(STORAGE_KEYS.COMPANY_DATA, company);
        },
        get<T = object>(): T | undefined {
            return persisterBase.get<T>(STORAGE_KEYS.COMPANY_DATA);
        },
        clear(): void {
            persisterBase.remove(STORAGE_KEYS.COMPANY_DATA);
        },
    },

    // Theme
    theme: {
        set(theme: string): void {
            persisterBase.set(STORAGE_KEYS.THEME, theme);
        },
        get(): string | undefined {
            return persisterBase.get<string>(STORAGE_KEYS.THEME);
        },
    },

    // Language
    language: {
        set(lang: string): void {
            persisterBase.set(STORAGE_KEYS.LANGUAGE, lang);
        },
        get(): string | undefined {
            return persisterBase.get<string>(STORAGE_KEYS.LANGUAGE);
        },
    },

    // UI State
    ui: {
        setSidebarCollapsed(collapsed: boolean): void {
            persisterBase.set(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
        },
        getSidebarCollapsed(): boolean {
            return persisterBase.get<boolean>(STORAGE_KEYS.SIDEBAR_COLLAPSED) ?? false;
        },
    },
};

export default persister;
