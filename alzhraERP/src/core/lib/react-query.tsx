// ============================================
// إعداد React Query
// React Query Configuration
// ============================================

import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createIndexedDBPersister } from './persistence';
import { useNetworkStatus } from '../../lib/hooks/useNetworkStatus';
import { syncStore } from './sync-store';
import { logger } from '../utils/logger';
import { processSyncMutation } from './sync-registry';

// ------------------------------------------
// Query Configuration
// ------------------------------------------
export const QUERY_CONFIG = {
    // Default stale time (15 minutes) - Increased for better offline experience
    DEFAULT_STALE_TIME: 15 * 60 * 1000,

    // Cache time (24 hours) - Store in IndexedDB for much longer
    DEFAULT_CACHE_TIME: 24 * 60 * 60 * 1000,

    // Retry configuration
    DEFAULT_RETRY: 3,
    RETRY_DELAY: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch configuration
    REFETCH_ON_WINDOW_FOCUS: false,
    REFETCH_ON_RECONNECT: true,

    // Timeout for queries
    DEFAULT_QUERY_TIMEOUT: 20000, // 20 seconds
} as const;

export const queryKeys = {
    // Auth
    auth: {
        me: ['auth', 'me'] as const,
        session: ['auth', 'session'] as const,
    },

    // Inventory
    inventory: {
        all: ['inventory'] as const,
        products: () => [...queryKeys.inventory.all, 'products'] as const,
        product: (id: string) => [...queryKeys.inventory.all, 'products', id] as const,
        categories: () => [...queryKeys.inventory.all, 'categories'] as const,
        warehouses: () => [...queryKeys.inventory.all, 'warehouses'] as const,
        stock: (warehouseId?: string) => [...queryKeys.inventory.all, 'stock', warehouseId] as const,
        movements: (productId?: string) => [...queryKeys.inventory.all, 'movements', productId] as const,
    },

    // Sales
    sales: {
        all: ['sales'] as const,
        invoices: () => [...queryKeys.sales.all, 'invoices'] as const,
        invoice: (id: string) => [...queryKeys.sales.invoices(), id] as const,
        returns: () => [...queryKeys.sales.all, 'returns'] as const,
        stats: () => [...queryKeys.sales.all, 'stats'] as const,
        analytics: (period: string) => [...queryKeys.sales.all, 'analytics', period] as const,
    },

    // Purchases
    purchases: {
        all: ['purchases'] as const,
        invoices: () => [...queryKeys.purchases.all, 'invoices'] as const,
        invoice: (id: string) => [...queryKeys.purchases.invoices(), id] as const,
        returns: () => [...queryKeys.purchases.all, 'returns'] as const,
        stats: () => [...queryKeys.purchases.all, 'stats'] as const,
    },

    // Accounting
    accounting: {
        all: ['accounting'] as const,
        accounts: () => [...queryKeys.accounting.all, 'accounts'] as const,
        account: (id: string) => [...queryKeys.accounting.accounts(), id] as const,
        journals: () => [...queryKeys.accounting.all, 'journals'] as const,
        journal: (id: string) => [...queryKeys.accounting.journals(), id] as const,
        trialBalance: (date: string) => [...queryKeys.accounting.all, 'trial-balance', date] as const,
        balanceSheet: (date: string) => [...queryKeys.accounting.all, 'balance-sheet', date] as const,
        incomeStatement: (period: string) => [...queryKeys.accounting.all, 'income-statement', period] as const,
    },

    // Parties (Customers/Suppliers)
    parties: {
        all: ['parties'] as const,
        customers: () => [...queryKeys.parties.all, 'customers'] as const,
        customer: (id: string) => [...queryKeys.parties.customers(), id] as const,
        suppliers: () => [...queryKeys.parties.all, 'suppliers'] as const,
        supplier: (id: string) => [...queryKeys.parties.suppliers(), id] as const,
        statement: (id: string, type: 'customer' | 'supplier') => [...queryKeys.parties.all, 'statement', id, type] as const,
    },

    // Dashboard
    dashboard: {
        stats: ['dashboard', 'stats'] as const,
        recentActivity: ['dashboard', 'recent-activity'] as const,
        topProducts: ['dashboard', 'top-products'] as const,
        topCustomers: ['dashboard', 'top-customers'] as const,
        salesChart: (period: string) => ['dashboard', 'sales-chart', period] as const,
        inventoryChart: (period: string) => ['dashboard', 'inventory-chart', period] as const,
    },

    // Reports
    reports: {
        all: ['reports'] as const,
        inventory: (type: string) => ['reports', 'inventory', type] as const,
        financial: (type: string, period: string) => ['reports', 'financial', type, period] as const,
        tax: (period: string) => ['reports', 'tax', period] as const,
        cashFlow: (period: string) => ['reports', 'cash-flow', period] as const,
    },

    // Settings
    settings: {
        all: ['settings'] as const,
        company: ['settings', 'company'] as const,
        warehouses: ['settings', 'warehouses'] as const,
        currency: ['settings', 'currency'] as const,
        fiscalYear: ['settings', 'fiscal-year'] as const,
        taxDiscount: ['settings', 'tax-discount'] as const,
        notifications: ['settings', 'notifications'] as const,
        security: ['settings', 'security'] as const,
    },
} as const;

// ------------------------------------------
// Query Client Factory
// ------------------------------------------
export const createQueryClient = (options?: Partial<typeof QUERY_CONFIG>) => {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: options?.DEFAULT_STALE_TIME ?? QUERY_CONFIG.DEFAULT_STALE_TIME,
                gcTime: options?.DEFAULT_CACHE_TIME ?? QUERY_CONFIG.DEFAULT_CACHE_TIME,
                retry: options?.DEFAULT_RETRY ?? QUERY_CONFIG.DEFAULT_RETRY,
                refetchOnWindowFocus: options?.REFETCH_ON_WINDOW_FOCUS ?? QUERY_CONFIG.REFETCH_ON_WINDOW_FOCUS,
                refetchOnReconnect: options?.REFETCH_ON_RECONNECT ?? QUERY_CONFIG.REFETCH_ON_RECONNECT,
            },
            mutations: {
                // Mutations should retry more aggressively when offline/network failure
                retry: 3,
                retryDelay: QUERY_CONFIG.RETRY_DELAY,
            },
        },
    });
};

// ------------------------------------------
// React Query Provider Component
// ------------------------------------------
interface ReactQueryProviderProps {
    children: ReactNode;
    client?: QueryClient;
}

/**
 * Hook to manage background synchronization of pending mutations
 */
const useSyncQueue = (queryClient: QueryClient) => {
    const { isOnline } = useNetworkStatus();
    const isProcessingRef = useRef(false);

    useEffect(() => {
        if (isOnline) {
            processQueue();
        }
    }, [isOnline]);

    const processQueue = async () => {
        if (isProcessingRef.current) return;

        const pending = await syncStore.getPending();
        if (pending.length === 0) return;

        isProcessingRef.current = true;

        logger.info('SyncModule', `Starting sync for ${pending.length} pending operations...`);

        try {
            for (const mutation of pending) {
                try {
                    // We use mutationCache directly to avoid creating new observers
                    await queryClient.getMutationCache().build(queryClient, {
                        mutationKey: mutation.mutationKey,
                        mutationFn: async (variables) => {
                            return processSyncMutation(mutation.mutationKey, variables);
                        }
                    }).execute(mutation.variables);

                    await syncStore.dequeue(mutation.id);
                } catch (error) {
                    logger.error('SyncModule', `Sync failed for mutation ${mutation.id}`, error);
                    await syncStore.incrementRetry(mutation.id);
                    break;
                }
            }
        } finally {
            isProcessingRef.current = false;
        }
    };
};

export const ReactQueryProvider: React.FC<ReactQueryProviderProps> = ({
    children,
    client
}) => {
    const [queryClient] = useState(() => client ?? createQueryClient());
    const [persister] = useState(() => createIndexedDBPersister());

    // Initialize sync queue
    useSyncQueue(queryClient);

    return (
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister }}
        >
            {children}
        </PersistQueryClientProvider>
    );
};

// ------------------------------------------
// Query Hook Options (Legacy Types)
// ------------------------------------------
export interface UseQueryOptions<TData, _TError = Error> {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchOnWindowFocus?: boolean;
    refetchOnReconnect?: boolean;
    retry?: number | false;
    retryDelay?: (attemptIndex: number) => number;
    select?: (data: unknown) => TData;
    placeholderData?: unknown;
    initialData?: unknown;
}

export interface UseMutationOptions<TData, TError, TVariables, TContext> {
    onMutate?: (variables: TVariables) => Promise<TContext | void> | TContext | void;
    onError?: (error: TError, variables: TVariables, context?: TContext) => void | Promise<void>;
    onSettled?: (data: TData, error: TError | null, variables: TVariables, context?: TContext) => void | Promise<void>;
    retry?: number | false;
    retryDelay?: (attemptIndex: number) => number;
}

// ------------------------------------------
// Utility Hooks
// ------------------------------------------
export const useInvalidateQueries = () => {
    return {
        invalidateAll: () => { },
        invalidateInventory: () => { },
        invalidateSales: () => { },
        invalidatePurchases: () => { },
        invalidateAccounting: () => { },
        invalidateParties: () => { },
        invalidateDashboard: () => { },
    };
};

export default queryKeys;
