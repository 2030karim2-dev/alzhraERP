/**
 * حساب نسبة التوفير من الكاش لخدمات الذكاء الاصطناعي
 * النسبة = hits / (misses + hits)
 */
const asPositive = (value: number): number => (Number.isFinite(value) && value > 0 ? value : 0);

export const calcCacheHitRate = (totalRequests: number, cacheHits: number): number => {
  const requests = asPositive(totalRequests);
  const hits = asPositive(cacheHits);
  const total = requests + hits;
  return total > 0 ? Math.round((hits / total) * 100) : 0;
};
