import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

const env = fs.readFileSync('.env.local', 'utf-8');
const connectionMatch = env.match(/DATABASE_URL=(.+)/);

let connectionString = '';
if (connectionMatch) {
    connectionString = connectionMatch[1].trim();
} else {
    // Construct from Supabase env vars if direct URL isn't available
    const mainEnv = fs.readFileSync('.env', 'utf-8');
    const urlMatch = mainEnv.match(/VITE_SUPABASE_URL=https:\/\/(.+)\.supabase\.co/);
    if (urlMatch) {
        // This is a placeholder, direct connection string is usually required for pg.
        // I will try to read the full node connection string from a common location.
        console.error("Direct DATABASE_URL not found in .env.local. Trying to connect via project ID requires standard postgres password.");
        process.exit(1);
    }
}

const sql = `
-- 1. Add deleted_at to inventory_transactions if missing
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory_transactions' AND column_name = 'deleted_at') THEN
        ALTER TABLE public.inventory_transactions ADD COLUMN deleted_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Trigger to reverse stock on inventory_transaction soft-delete
CREATE OR REPLACE FUNCTION public.trg_sync_inventory_stock_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- If deleted_at is changed from NULL to some value (soft delete)
    IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
        -- Reverse the stock movement
        -- If it was a sale/return_purchase (quantity was negative in logic, but stored as positive often)
        -- Actually, inventory_transactions quantity is usually positive, 
        -- but the movement direction depends on the type.
        -- We need to check if the transaction was adding or subtracting.
        -- In this system, sales/returns usually subtract/add.
        
        -- Logic: If it was a 'sale' or 'return_purchase' (reduction), we ADD back.
        -- If it was a 'purchase' or 'return_sale' (addition), we SUBTRACT back.
        
        IF NEW.transaction_type IN ('sale', 'return_purchase') THEN
            UPDATE public.product_stock 
            SET quantity = quantity + NEW.quantity 
            WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;
        ELSIF NEW.transaction_type IN ('purchase', 'return_sale') THEN
            UPDATE public.product_stock 
            SET quantity = quantity - NEW.quantity 
            WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_inventory_stock_on_delete_trigger ON public.inventory_transactions;
CREATE TRIGGER trg_sync_inventory_stock_on_delete_trigger
    AFTER UPDATE OF deleted_at ON public.inventory_transactions
    FOR EACH ROW
    WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
    EXECUTE FUNCTION public.trg_sync_inventory_stock_on_delete();

-- 3. Trigger to propagate invoice soft-delete to accounting and inventory
CREATE OR REPLACE FUNCTION public.trg_invoice_soft_delete_propagation()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL) THEN
        -- Propagate to journal_entries
        UPDATE public.journal_entries 
        SET deleted_at = NEW.deleted_at 
        WHERE reference_id = NEW.id OR (notes LIKE '%' || NEW.invoice_number || '%');

        -- Propagate to inventory_transactions
        UPDATE public.inventory_transactions 
        SET deleted_at = NEW.deleted_at 
        WHERE reference_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_invoice_soft_delete_propagation_trigger ON public.invoices;
CREATE TRIGGER trg_invoice_soft_delete_propagation_trigger
    AFTER UPDATE OF deleted_at ON public.invoices
    FOR EACH ROW
    WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
    EXECUTE FUNCTION public.trg_invoice_soft_delete_propagation();
`;

async function run() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log("Connected to database. Executing fix...");
        await client.query(sql);
        console.log("Fix executed successfully.");
    } catch (err) {
        console.error("Error executing fix:", err);
    } finally {
        await client.end();
    }
}

run();
