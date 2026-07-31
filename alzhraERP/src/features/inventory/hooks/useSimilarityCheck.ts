import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import productService from '../services/productService';
import { logger } from '../../../core/utils/logger';

export const useSimilarityCheck = (name: string, company_id?: string, isEdit: boolean = false) => {
    const [similarProducts, setSimilarProducts] = useState<any[]>([]);
    const [isChecking, setIsChecking] = useState(false);
    const [debouncedName] = useDebounce(name, 600);

    useEffect(() => {
        const checkSimilarity = async () => {
            if (!debouncedName || debouncedName.length < 3 || !company_id || isEdit) {
                setSimilarProducts([]);
                return;
            }

            setIsChecking(true);
            try {
                const results = await productService.getSimilarProducts(debouncedName, company_id);
                setSimilarProducts(results);
            } catch (err) {
                logger.warn('useSimilarityCheck', 'Similarity check failed', err);
                setSimilarProducts([]);
            } finally {
                setIsChecking(false);
            }
        };

        checkSimilarity();
    }, [debouncedName, company_id, isEdit]);

    return { similarProducts, isChecking, setSimilarProducts };
};
