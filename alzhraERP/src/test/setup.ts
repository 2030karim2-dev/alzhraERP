/// <reference types="vitest" />
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock matchMedia
global.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    unobserve: vi.fn(),
}));

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    writable: true,
});

// Mock localStorage with a WORKING in-memory implementation.
// A bare `vi.fn()` mock returns `undefined` for every getItem and stores
// nothing, which silently broke any test relying on a storage round-trip
// (e.g. AI model allowlist: setActiveModel -> getActiveModel).
const createLocalStorageMock = () => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string): string | null => (key in store ? store[key] : null),
        setItem: (key: string, value: string): void => { store[key] = String(value); },
        removeItem: (key: string): void => { delete store[key]; },
        clear: (): void => { store = {}; },
        get length(): number { return Object.keys(store).length; },
        key: (index: number): string | null => Object.keys(store)[index] ?? null,
    };
};
Object.defineProperty(window, 'localStorage', {
    value: createLocalStorageMock(),
});

// Suppress console errors during tests
const originalError = console.error;
console.error = (...args: unknown[]) => {
    if (
        typeof args[0] === 'string' &&
        args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
        return;
    }
    originalError.call(console, ...args);
};
