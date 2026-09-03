import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';

/**
 * مفاتيح الميزات العامة المتاحة في المنصة.
 * يتم قراءتها من system_platform_configs (المفتوح للقراءة العامة عبر RLS).
 */
export interface PlatformFeatureFlags {
  ai_assistance: boolean;
  vin_intelligence: boolean;
  supplier_portal: boolean;
  internal_chat: boolean;
  offline_sync: boolean;
}

const DEFAULT_FLAGS: PlatformFeatureFlags = {
  ai_assistance: true,
  vin_intelligence: true,
  supplier_portal: true,
  internal_chat: true,
  offline_sync: true,
};

/**
 * usePlatformFeatureFlags — جلب مفاتيح الميزات العامة من قاعدة البيانات.
 * يعود بالقيم الافتراضية (كل شيء مفعل) عند فشل الجلب.
 * staleTime: 30 ثانية. Refetch: كل 60 ثانية عند فتح التبويب أو التركيز عليه.
 */
export const usePlatformFeatureFlags = () => {
  return useQuery({
    queryKey: ['platform_feature_flags'],
    queryFn: async (): Promise<PlatformFeatureFlags> => {
      const { data, error } = await (supabase as any)
        .from('system_platform_configs')
        .select('value')
        .eq('key', 'feature_flags')
        .single();

      if (error || !data?.value) {
        return DEFAULT_FLAGS;
      }

      return {
        ...DEFAULT_FLAGS,
        ...(data.value as Partial<PlatformFeatureFlags>),
      };
    },
    staleTime: 30_000,
    gcTime: 2 * 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
};

/**
 * useIsFeatureEnabled — فحص سريع لميزة واحدة.
 * يعيد true عند فشل الجلب (fail-open) حتى لا يُعطَّل شيء بالخطأ.
 */
export const useIsFeatureEnabled = (flag: keyof PlatformFeatureFlags): boolean => {
  const { data: flags } = usePlatformFeatureFlags();
  return flags?.[flag] ?? true;
};
