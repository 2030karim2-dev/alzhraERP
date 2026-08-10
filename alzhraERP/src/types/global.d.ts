/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Global window extensions for Al-Zahra ERP
 * Used to prevent duplicate realtime channel subscriptions
 * during React StrictMode double-mounting and HMR.
 */
interface AlzChannelRegistry {
    __ALZ_PRODUCT_CHANNELS__?: Map<string, any>;
    __ALZ_PAGINATED_CHANNELS__?: Map<string, any>;
    __ALZ_DASHBOARD_CHANNELS__?: Map<string, any>;
    __ALZ_AUDIT_CHANNELS__?: Map<string, any>;
    __ALZ_REALTIME_CHANNELS__?: Map<string, any>;
}

declare global {
    interface Window extends AlzChannelRegistry {}
}

export {};