import { TableRow, TableInsert, TableUpdate } from './common.types';

// ============================================
// Products & Variants
// ============================================
export type DBProduct = TableRow<'products'>;
export type DBProductInsert = TableInsert<'products'>;
export type DBProductUpdate = TableUpdate<'products'>;



// ============================================
// Warehouses & Stock
// ============================================
export type DBWarehouse = TableRow<'warehouses'>;
export type DBWarehouseInsert = TableInsert<'warehouses'>;

export type DBProductStock = TableRow<'product_stock'>;
export type DBProductStockInsert = TableInsert<'product_stock'>;
export type DBProductStockUpdate = TableUpdate<'product_stock'>;

// ============================================
// Inventory Transactions
// ============================================
export type DBInventoryTransaction = TableRow<'inventory_transactions'>;
export type DBInventoryTransactionInsert = TableInsert<'inventory_transactions'>;

// ============================================
// Stock Transfers
// ============================================
export type DBStockTransfer = TableRow<'stock_transfers'>;
export type DBStockTransferInsert = TableInsert<'stock_transfers'>;

export type DBStockTransferItem = TableRow<'stock_transfer_items'>;
export type DBStockTransferItemInsert = TableInsert<'stock_transfer_items'>;

// ============================================
// Audits
// ============================================
export type DBStockAuditSession = TableRow<'audit_sessions'>;
export type DBStockAuditSessionInsert = TableInsert<'audit_sessions'>;

export type DBStockAuditItem = TableRow<'audit_items'>;
export type DBStockAuditItemInsert = TableInsert<'audit_items'>;
