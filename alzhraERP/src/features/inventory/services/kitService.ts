/**
 * Kit Assembly/Disassembly Service for Automotive Parts
 * 
 * Manages kit bundling (e.g., timing belt kits, brake pad kits, gasket sets).
 * When a kit is assembled, component stock is reduced and kit stock is increased.
 * When disassembled, the reverse happens.
 * 
 * @module features/inventory/services/kitService
 */

import { supabase } from '../../../lib/supabaseClient';
import { ProductKitItem } from '../types';

export interface KitAssemblyResult {
    success: boolean;
    kitProductId: string;
    quantity: number;
    componentsUsed: { productId: string; name: string; quantity: number }[];
    errors: string[];
}

export const kitService = {
    /**
     * Assemble kits from components
     * Reduces component stock and increases kit stock
     */
    assembleKit: async (
        companyId: string,
        kitProductId: string,
        warehouseId: string,
        quantity: number,
        userId: string
    ): Promise<KitAssemblyResult> => {
        const errors: string[] = [];
        const componentsUsed: { productId: string; name: string; quantity: number }[] = [];

        // 1. Get kit components
        const { data: components, error: componentsError } = await supabase
            .from('product_kit_items')
            .select(`
                *,
                component_product:products!component_product_id(
                    id, name, name_ar, sku, stock_quantity
                )
            `)
            .eq('kit_product_id', kitProductId);

        if (componentsError || !components || components.length === 0) {
            return {
                success: false,
                kitProductId,
                quantity,
                componentsUsed: [],
                errors: ['Kit has no components defined or product is not a kit']
            };
        }

        // 2. Check stock availability for all components
        for (const component of components) {
            const requiredQty = Number(component.quantity) * quantity;

            const { data: stockData } = await supabase
                .from('product_stock')
                .select('quantity')
                .eq('product_id', component.component_product_id)
                .eq('warehouse_id', warehouseId)
                .single();

            const availableQty = Number(stockData?.quantity || 0);

            if (availableQty < requiredQty) {
                errors.push(
                    `Insufficient stock for ${component.component_product?.name || component.component_product_id}: ` +
                    `need ${requiredQty}, available ${availableQty}`
                );
            }

            componentsUsed.push({
                productId: component.component_product_id,
                name: component.component_product?.name || component.component_product?.name_ar || '',
                quantity: requiredQty
            });
        }

        if (errors.length > 0) {
            return { success: false, kitProductId, quantity, componentsUsed, errors };
        }

        // 3. Execute the assembly in a transaction
        const { error: rpcError } = await supabase.rpc('assemble_kit', {
            p_company_id: companyId,
            p_kit_product_id: kitProductId,
            p_warehouse_id: warehouseId,
            p_quantity: quantity,
            p_user_id: userId
        });

        if (rpcError) {
            return {
                success: false,
                kitProductId,
                quantity,
                componentsUsed,
                errors: [`Assembly failed: ${rpcError.message}`]
            };
        }

        return { success: true, kitProductId, quantity, componentsUsed, errors: [] };
    },

    /**
     * Disassemble kits back into components
     * Reduces kit stock and increases component stock
     */
    disassembleKit: async (
        companyId: string,
        kitProductId: string,
        warehouseId: string,
        quantity: number,
        userId: string
    ): Promise<KitAssemblyResult> => {
        const errors: string[] = [];

        // 1. Check kit stock availability
        const { data: kitStock } = await supabase
            .from('product_stock')
            .select('quantity')
            .eq('product_id', kitProductId)
            .eq('warehouse_id', warehouseId)
            .single();

        const availableQty = Number(kitStock?.quantity || 0);
        if (availableQty < quantity) {
            return {
                success: false,
                kitProductId,
                quantity,
                componentsUsed: [],
                errors: [`Insufficient kit stock: need ${quantity}, available ${availableQty}`]
            };
        }

        // 2. Execute disassembly
        const { error: rpcError } = await supabase.rpc('disassemble_kit', {
            p_company_id: companyId,
            p_kit_product_id: kitProductId,
            p_warehouse_id: warehouseId,
            p_quantity: quantity,
            p_user_id: userId
        });

        if (rpcError) {
            return {
                success: false,
                kitProductId,
                quantity,
                componentsUsed: [],
                errors: [`Disassembly failed: ${rpcError.message}`]
            };
        }

        return { success: true, kitProductId, quantity, componentsUsed: [], errors: [] };
    },

    /**
     * Get kit components with current stock levels
     */
    getKitComponents: async (
        kitProductId: string,
        warehouseId?: string
    ): Promise<(ProductKitItem & { availableStock: number })[]> => {
        const query = supabase
            .from('product_kit_items')
            .select(`
                *,
                component_product:products!component_product_id(
                    id, name, name_ar, sku, part_number, brand, cost_price, sale_price
                )
            `)
            .eq('kit_product_id', kitProductId);

        const { data, error } = await query;

        if (error || !data) {
            console.error('KitService: getKitComponents failed', error);
            return [];
        }

        // Enrich with stock info
        const enriched = await Promise.all(
            data.map(async (item) => {
                let availableStock = 0;
                if (warehouseId) {
                    const { data: stock } = await supabase
                        .from('product_stock')
                        .select('quantity')
                        .eq('product_id', item.component_product_id)
                        .eq('warehouse_id', warehouseId)
                        .single();
                    availableStock = Number(stock?.quantity || 0);
                }
                return { ...item, availableStock } as ProductKitItem & { availableStock: number };
            })
        );

        return enriched;
    }
};