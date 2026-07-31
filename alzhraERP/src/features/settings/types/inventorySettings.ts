// Inventory Settings Types
export interface InventorySettings {
    // Default warehouse
    default_warehouse_id: string;

    // Alerts
    low_stock_threshold: number;
    low_stock_alert_enabled: boolean;
    low_stock_alert_email: boolean;
    low_stock_alert_push: boolean;

    // Product codes
    auto_generate_sku: boolean;
    sku_prefix: string;
    sku_format: string;

    // Valuation
    inventory_valuation_method: 'fifo' | 'lifo' | 'weighted_average';

    // Movements
    require_approval_for_transfers: boolean;
    allow_negative_stock: boolean;

    // Audit
    enable_stock_audit: boolean;
    audit_frequency: 'monthly' | 'quarterly' | 'yearly';

    // Cost Method
    cost_method: 'fifo' | 'lifo' | 'average';

    // Low Stock Alert
    default_low_stock_threshold: number;
    enable_low_stock_alert: boolean;

    // Tracking
    track_serial_numbers: boolean;
    track_expiry_dates: boolean;
    expiry_alert_days: number;

    // Auto Alerts
    auto_alert_on_low_stock: boolean;
    auto_alert_on_expiry: boolean;
    auto_reorder_enabled: boolean;
}

export const DEFAULT_INVENTORY_SETTINGS: InventorySettings = {
    default_warehouse_id: '',
    low_stock_threshold: 10,
    low_stock_alert_enabled: true,
    low_stock_alert_email: true,
    low_stock_alert_push: true,
    auto_generate_sku: true,
    sku_prefix: 'PRD-',
    sku_format: 'XXXX',
    inventory_valuation_method: 'fifo',
    require_approval_for_transfers: false,
    allow_negative_stock: false,
    enable_stock_audit: true,
    audit_frequency: 'monthly',
    cost_method: 'fifo',
    default_low_stock_threshold: 10,
    enable_low_stock_alert: true,
    track_serial_numbers: false,
    track_expiry_dates: false,
    expiry_alert_days: 30,
    auto_alert_on_low_stock: true,
    auto_alert_on_expiry: true,
    auto_reorder_enabled: false,
};
