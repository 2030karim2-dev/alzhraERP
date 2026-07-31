
import { generateAIContent } from '../../ai/core/provider';
import { CATEGORY_CLASSIFICATION_PROMPT, buildCategorizationPrompt } from './aiCategoryPrompts';
import { inventoryApi } from '../api';
import { supabase } from '../../../lib/supabaseClient';

export interface ClassificationResult {
    product_id: string;
    product_name: string;
    suggested_category_id: string | null;
    suggested_category_name: string;
    is_new_category: boolean;
    confidence: number;
    reasoning: string;
}

interface RawAIResult {
    product_id: string;
    category_index?: string | number;
    suggested_category_name?: string;
    is_new_category?: boolean;
    confidence?: number;
    reasoning?: string;
}

export const aiCategoryService = {
    /**
     * Fetch products that need categorization (category_id is null or name is 'عام')
     */
    getUncategorizedProducts: async (companyId: string, limitNum: number = 100) => {
        // 1. Find the 'General' category ID if it exists
        const { data: generalCat } = await supabase
            .from('product_categories')
            .select('id')
            .eq('company_id', companyId)
            .eq('name', 'عام')
            .is('deleted_at', null)
            .maybeSingle();

        // 2. Query products
        const query = supabase
            .from('products')
            .select('id, name_ar, category_id')
            .eq('company_id', companyId)
            .is('deleted_at', null);

        let finalQuery;
        if (generalCat?.id) {
            finalQuery = query.or(`category_id.is.null,category_id.eq.${generalCat.id as string}`);
        } else {
            finalQuery = query.is('category_id', null);
        }

        const { data: products, error } = await finalQuery
            .order('name_ar', { ascending: true }) // Consistently get items
            .limit(limitNum);

        if (error) throw error;
        return products || [];
    },

    /**
     * Classify a batch of products using AI
     */
    classifyBatch: async (
        products: { id: string; name_ar: string }[],
        categories: { id: string; name: string }[]
    ): Promise<ClassificationResult[]> => {
        if (products.length === 0) return [];

        const prompt = buildCategorizationPrompt(
            products.map(p => ({ id: p.id, name: p.name_ar })),
            categories
        );

        const response = await generateAIContent(prompt, CATEGORY_CLASSIFICATION_PROMPT, { jsonMode: true });
        
        try {
            // Extremely robust parsing
            let cleanResponse = response.trim();
            const firstBracket = cleanResponse.indexOf('[');
            const lastBracket = cleanResponse.lastIndexOf(']');

            if (firstBracket !== -1) {
                if (lastBracket !== -1 && lastBracket > firstBracket) {
                    cleanResponse = cleanResponse.substring(firstBracket, lastBracket + 1);
                } else {
                    const lastBrace = cleanResponse.lastIndexOf('}');
                    if (lastBrace !== -1 && lastBrace > firstBracket) {
                        cleanResponse = cleanResponse.substring(firstBracket, lastBrace + 1) + ']';
                    } else {
                        cleanResponse = cleanResponse.substring(firstBracket) + ']';
                    }
                }
            }

            const rawResults = JSON.parse(cleanResponse) as RawAIResult[];
            
            // Map back the results
            return rawResults.map(raw => {
                const product = products.find(p => p.id === raw.product_id);
                
                // Map the category_index (1-based) back to the category ID
                let suggested_category_id: string | null = null;
                let suggested_category_name = raw.suggested_category_name || '';

                if (raw.category_index) {
                    const idx = parseInt(String(raw.category_index)) - 1;
                    if (categories[idx]) {
                        suggested_category_id = categories[idx].id;
                        if (!suggested_category_name) {
                            suggested_category_name = categories[idx].name;
                        }
                    }
                }

                return {
                    product_id: raw.product_id,
                    product_name: product?.name_ar || 'منتج غير معروف',
                    suggested_category_id,
                    suggested_category_name,
                    is_new_category: Boolean(raw.is_new_category),
                    confidence: raw.confidence || 0,
                    reasoning: raw.reasoning || ''
                };
            });
        } catch (error) {
            console.error('Failed to parse AI response:', response);
            throw new Error('فشل تحليل رد الذكاء الاصطناعي. يرجى المحاولة مرة أخرى.');
        }
    },

    /**
     * Apply classifications to the database
     */
    applyChanges: async (companyId: string, results: ClassificationResult[]) => {
        // 1. Fetch current categories to check for existence
        const { data: existingCategories, error: catFetchError } = await supabase
            .from('product_categories')
            .select('id, name')
            .eq('company_id', companyId)
            .is('deleted_at', null);

        if (catFetchError) throw catFetchError;

        const categoryMap: Record<string, string> = {}; // Name -> ID
        (existingCategories as { id: string, name: string }[])?.forEach((c) => {
            if (c.name) categoryMap[c.name] = c.id;
        });

        // 2. Group by new categories that need to be created (those NOT already in database)
        const newNamesRequested = [...new Set(results
            .filter(r => r.is_new_category)
            .map(r => r.suggested_category_name))];

        for (const catName of newNamesRequested) {
            // Only create if it doesn't exist in the database yet
            if (!categoryMap[catName]) {
                const { data, error } = await inventoryApi.createCategory(companyId, catName);
                if (error) {
                    console.error(`Failed to create category ${catName}:`, error);
                    throw new Error(`فشل إنشاء القسم الجديد "${catName}". قد يكون القسم موجوداً بالفعل باسم مشابه.`);
                }
                if (data) {
                    categoryMap[catName] = (data as { id: string }).id;
                }
            }
        }

        // 3. Update products
        const updates = results.map(r => ({
            id: r.product_id,
            category_id: r.is_new_category 
                ? categoryMap[r.suggested_category_name] 
                : r.suggested_category_id
        })).filter(u => u.category_id);

        // Execute updates and check for errors
        const results_data = await Promise.all(
            updates.map(u => 
                supabase.from('products')
                    .update({ category_id: u.category_id })
                    .eq('id', u.id)
                    .select('id')
            )
        );

        const errors = results_data.filter(r => r.error).map(r => r.error);
        if (errors.length > 0) {
            console.error('Errors updating products:', errors);
            throw new Error(`فشل تحديث بعض المنتجات (${errors.length} خطأ). يرجى مراجعة سجلات المتصفح.`);
        }
    }
};
