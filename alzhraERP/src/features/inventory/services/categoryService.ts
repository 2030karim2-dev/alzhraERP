// Category Service - Handles product category operations
import { inventoryApi } from '../api';

interface RawCategory {
    id: string;
    name?: string;
    name_ar?: string;
}

export const categoryService = {
    /**
     * Get all categories for a company
     */
    getCategories: async (companyId: string) => {
        // Fetch both categories and products to compute metrics
        const [categoriesResponse, productsResponse] = await Promise.all([
            inventoryApi.getCategories(companyId),
            inventoryApi.getProducts(companyId)
        ]);

        const categories = Array.isArray(categoriesResponse)
            ? categoriesResponse
            : (categoriesResponse as any)?.data || [];

        const products = Array.isArray(productsResponse)
            ? productsResponse
            : (productsResponse as any)?.data || [];

        return categories.map((cat: RawCategory) => {
            const categoryProducts = products.filter((p: any) => p.category_id === cat.id || p.category === (cat.name || cat.name_ar));
            const productsCount = categoryProducts.length;
            const totalStock = categoryProducts.reduce((sum: number, p: any) => sum + (Number(p.stock_quantity) || 0), 0);
            const totalValue = categoryProducts.reduce((sum: number, p: any) => sum + ((Number(p.cost_price) || 0) * (Number(p.stock_quantity) || 0)), 0);
            const hasAlert = categoryProducts.some((p: any) => (Number(p.stock_quantity) || 0) <= (Number(p.min_stock_level) || 0));

            return {
                id: cat.id,
                name: cat.name || cat.name_ar,
                productsCount,
                totalStock,
                totalValue,
                hasAlert
            };
        });
    },

    /**
     * Create a new category
     */
    createCategory: async (companyId: string, name: string) => {
        const { data, error } = await inventoryApi.createCategory(companyId, name);
        if (error) throw error;
        return data;
    },

    /**
     * Delete a category
     */
    deleteCategory: async (id: string) => {
        const { error } = await inventoryApi.deleteCategory(id);
        if (error) throw error;
    }
};

export default categoryService;
