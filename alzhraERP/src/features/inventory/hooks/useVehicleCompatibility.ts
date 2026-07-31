import { useQuery } from '@tanstack/react-query';
import { autoPartsApi, VehicleCompatibility, ArticleInfo } from '../services/autoPartsApi';

interface CompatibilityResult {
  article: ArticleInfo | null;
  vehicles: VehicleCompatibility[];
}

export function useVehicleCompatibility(articleNo: string) {
  return useQuery<CompatibilityResult, Error>({
    queryKey: ['vehicle_compatibility', articleNo],
    queryFn: () => autoPartsApi.getCompatibilityByArticle(articleNo),
    enabled: !!articleNo,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours of cache
    retry: 1,
  });
}
