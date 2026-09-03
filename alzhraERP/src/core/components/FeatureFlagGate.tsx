import React from 'react';
import { Ban } from 'lucide-react';
import { useIsFeatureEnabled, type PlatformFeatureFlags } from '../hooks/usePlatformFeatureFlags';

/**
 * FeatureFlagGate — يحجب المحتوى إذا كان مفتاح الميزة معطلاً من قبل السوبر أدمن.
 * يعرض رسالة واضحة بدلاً من المكون الأصلي عند الإيقاف.
 *
 * الاستخدام:
 *   <FeatureFlagGate flag="ai_assistance" label="الذكاء الاصطناعي">
 *     <AIComponent />
 *   </FeatureFlagGate>
 */

interface FeatureFlagGateProps {
  flag: keyof PlatformFeatureFlags;
  label: string;
  children: React.ReactNode;
}

export const FeatureFlagGate: React.FC<FeatureFlagGateProps> = ({ flag, label, children }) => {
  const isEnabled = useIsFeatureEnabled(flag);

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/5 p-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
          <Ban size={24} />
        </div>
        <h3 className="text-sm font-black text-[var(--app-text)]">خدمة {label} متوقفة مؤقتاً</h3>
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--app-text-secondary)]">
          قام مدير المنصة بتعطيل هذه الخدمة مؤقتاً. يُرجى المحاولة لاحقاً أو التواصل مع الدعم الفني.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
