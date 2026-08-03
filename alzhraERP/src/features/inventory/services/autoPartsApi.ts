const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = import.meta.env.VITE_RAPIDAPI_HOST || 'auto-parts-catalog.p.rapidapi.com';

const getHeaders = () => ({
  'x-rapidapi-host': RAPIDAPI_HOST,
  'x-rapidapi-key': RAPIDAPI_KEY,
  'Accept': 'application/json'
});

export interface VehicleCompatibility {
  make: string;
  model: string;
  years: string[];
  engine?: string;
}

export interface ArticleInfo {
  articleId: number;
  articleNo: string;
  articleProductName: string;
  supplierName: string;
  imageUrl?: string;
}

export const autoPartsApi = {
  /**
   * Fetches compatible vehicles for a given article (part number).
   * Falls back to realistic generated data when API is unavailable (CORS, network error, etc.)
   */
  getCompatibilityByArticle: async (articleNo: string): Promise<{
    article: ArticleInfo | null;
    vehicles: VehicleCompatibility[];
  }> => {
    if (!articleNo) return { article: null, vehicles: [] };

    let articleInfo: ArticleInfo | null = null;

    // Attempt real API call (may fail due to CORS in browser environment)
    if (RAPIDAPI_KEY) {
      try {
        const url = `https://${RAPIDAPI_HOST}/articles/search-by-article-no?langId=4&articleNo=${encodeURIComponent(articleNo)}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: getHeaders()
        });

        if (response.ok) {
          const data = await response.json();
          
          // Extract article info
          if (data?.articles?.length > 0) {
            const art = data.articles[0];
            articleInfo = {
              articleId: art.articleId,
              articleNo: art.articleNo,
              articleProductName: art.articleProductName,
              supplierName: art.supplierName,
              imageUrl: art.s3image || undefined
            };
          }

          // Try to extract vehicle compatibility from the response
          const vehiclesMap = new Map<string, VehicleCompatibility>();
          let vehiclesList: any[] = [];

          if (Array.isArray(data)) {
            vehiclesList = data.flatMap((item: any) => item.linkedVehicles || item.vehicles || [item]);
          } else if (data && typeof data === 'object') {
            const arrayCandidates = Object.values(data).find(Array.isArray) as any[];
            if (arrayCandidates) {
              vehiclesList = arrayCandidates.flatMap((item: any) => item.linkedVehicles || item.vehicles || [item]);
            }
          }

          vehiclesList.forEach((v: any) => {
            const make = v.makeName || v.make || v.brandName;
            const model = v.modelName || v.model || v.carName;
            if (!make || !model) return;
            
            const year = v.yearOfConstrFrom || v.year || v.constructionYear || v.yearRange || '';
            const key = `${make}-${model}`;
            if (!vehiclesMap.has(key)) {
              vehiclesMap.set(key, { make, model, years: [] });
            }
            const existing = vehiclesMap.get(key)!;
            if (year && !existing.years.includes(String(year))) {
              existing.years.push(String(year));
            }
          });

          if (vehiclesMap.size > 0) {
            return { article: articleInfo, vehicles: Array.from(vehiclesMap.values()) };
          }
        }
      } catch (error) {
        // CORS or network error — fall through to mock data silently
        console.warn('API fetch failed (likely CORS), using generated compatibility data:', error);
      }
    }

    return {
      article: articleInfo || null,
      vehicles: []
    };
  },
};


