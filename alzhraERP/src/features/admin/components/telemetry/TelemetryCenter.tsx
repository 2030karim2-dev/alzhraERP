import React from 'react';
import {
  Bot,
  Car,
  Store,
  MessageSquare,
  WifiOff,
  CheckCircle2,
  Database,
  RefreshCw,
} from 'lucide-react';
import type { PlatformMetrics } from '../../types';
import { useServiceTelemetry } from '../../hooks/useAdminData';
import { calcCacheHitRate } from '../../utils';
import Button from '../../../../ui/base/Button';

interface TelemetryCenterProps {
  metrics?: PlatformMetrics | undefined;
}

export const TelemetryCenter: React.FC<TelemetryCenterProps> = ({ metrics }) => {
  const { data: serviceTelemetry, refetch, isFetching } = useServiceTelemetry();
  const cacheHitRate = calcCacheHitRate(
    metrics?.total_ai_requests || 0,
    metrics?.ai_cache_hits || 0
  );

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xs font-black text-[var(--app-text)]">
            مركز مراقبة واستهلاك الخدمات التقنية (Platform Telemetry)
          </h2>
          <p className="text-[10px] text-[var(--app-text-secondary)]">
            بطاقة الحالة العامة للخدمات التقنية: إحصاءات الذكاء الاصطناعي، رسائل المحادثات، تحليلات
            VIN المحفوظة، وسجلات أسعار الموردين تُقرأ مباشرة من قاعدة البيانات؛ باقي الأسطر معلومات
            وصفية للمنصة.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void refetch();
          }}
          disabled={isFetching}
          className="flex items-center gap-1.5 self-start px-2.5 py-1 text-xs sm:self-auto"
        >
          <RefreshCw size={12} className={isFetching ? 'animate-spin text-blue-500' : ''} />
          <span>تحديث المقاييس</span>
        </Button>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {/* Service 1: AI Part Intelligence */}
        <div className="space-y-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600">
                <Bot size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-[var(--app-text)]">
                  الذكاء الاصطناعي للقطع (AI Part Lookup)
                </h3>
                <span className="text-[10px] font-bold text-purple-600">
                  نموذج Gemini Multimodal
                </span>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] p-2">
              <span className="text-[11px] text-[var(--app-text-secondary)]">
                إجمالي استدعاءات الـ API:
              </span>
              <span className="font-mono font-bold text-[var(--app-text)]">
                {metrics?.total_ai_requests || 0}
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] p-2">
              <span className="text-[11px] text-[var(--app-text-secondary)]">
                الاستجابات المخدومة من الكاش:
              </span>
              <span className="font-mono font-bold text-emerald-600">
                {metrics?.ai_cache_hits || 0}
              </span>
            </div>
            <div className="flex justify-between rounded-lg border border-purple-500/20 bg-purple-500/10 p-2 font-bold text-purple-700 dark:text-purple-300">
              <span className="text-[11px]">معدل توفير التكلفة (Cache Hit):</span>
              <span className="font-mono">{cacheHitRate}%</span>
            </div>
          </div>
        </div>

        {/* Service 2: VIN Intelligence */}
        <div className="space-y-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <Car size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-[var(--app-text)]">
                  ذكاء الشاصي (VIN Intelligence)
                </h3>
                <span className="text-[10px] font-bold text-blue-600">
                  فك وترميز مواصفات المركبات
                </span>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] p-2">
              <span className="text-[11px] text-[var(--app-text-secondary)]">حالة المحرك:</span>
              <span className="flex items-center gap-1 font-bold text-emerald-600">
                <CheckCircle2 size={12} /> متصل وجاهز
              </span>
            </div>
            <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] p-2">
              <span className="text-[11px] text-[var(--app-text-secondary)]">
                تغطية الشركات المصنعة:
              </span>
              <span className="font-bold text-[var(--app-text)]">
                تويوتا، هوندا، نيسان، فورد...
              </span>
            </div>
            <div className="flex justify-between rounded-lg border border-blue-500/20 bg-blue-500/10 p-2 font-bold text-blue-700 dark:text-blue-300">
              <span className="text-[11px]">التحليلات المحفوظة (VIN):</span>
              <span className="font-mono">{serviceTelemetry?.total_vin_analyses ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Service 3: Supplier Dedicated Portal */}
        <div className="space-y-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Store size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-[var(--app-text)]">
                  بوابة الموردين (Supplier Portal)
                </h3>
                <span className="text-[10px] font-bold text-amber-600">
                  بوابة تسعير الموردين العامة
                </span>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] p-2">
              <span className="text-[11px] text-[var(--app-text-secondary)]">
                الوصول عبر التوكنات:
              </span>
              <span className="font-bold text-emerald-600">مفعل وآمن RLS</span>
            </div>
            <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] p-2">
              <span className="text-[11px] text-[var(--app-text-secondary)]">
                حماية الـ Rate Limiting:
              </span>
              <span className="font-bold text-emerald-600">نشطة (60 req/min)</span>
            </div>
            <div className="flex justify-between rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 font-bold text-amber-700 dark:text-amber-300">
              <span className="text-[11px]">سجلات أسعار الموردين:</span>
              <span className="font-mono">{serviceTelemetry?.total_supplier_price_rows ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Service 4: Enterprise Chat Collaboration */}
        <div className="space-y-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600">
                <MessageSquare size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-[var(--app-text)]">
                  المحادثات والتواصل (Chat Hub)
                </h3>
                <span className="text-[10px] font-bold text-blue-600">نظام قنوات ورسائل فورية</span>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] p-2">
              <span className="text-[11px] text-[var(--app-text-secondary)]">طبقة Realtime:</span>
              <span className="font-bold text-emerald-600">Supabase Channels</span>
            </div>
            <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] p-2">
              <span className="text-[11px] text-[var(--app-text-secondary)]">
                عزل الفروع والمحادثات:
              </span>
              <span className="font-bold text-emerald-600">RLS محكم</span>
            </div>
            <div className="flex justify-between rounded-lg border border-blue-500/20 bg-blue-500/10 p-2 font-bold text-blue-700 dark:text-blue-300">
              <span className="text-[11px]">رسائل المحادثات الكلية:</span>
              <span className="font-mono">{serviceTelemetry?.total_chat_messages ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Service 5: Offline Sync Engine */}
        <div className="space-y-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600">
                <WifiOff size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-[var(--app-text)]">
                  المزامنة غير المتصلة (Sync Engine)
                </h3>
                <span className="text-[10px] font-bold text-teal-600">
                  العمل بدون إنترنت ونقاط البيع
                </span>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] p-2">
              <span className="text-[11px] text-[var(--app-text-secondary)]">
                قاعدة التخزين المحلية:
              </span>
              <span className="font-bold text-teal-600">IndexedDB Local DB</span>
            </div>
            <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] p-2">
              <span className="text-[11px] text-[var(--app-text-secondary)]">
                فض النزاعات (Conflict Resolution):
              </span>
              <span className="font-bold text-[var(--app-text)]">Server Timestamp / Locks</span>
            </div>
            <div className="flex justify-between rounded-lg border border-teal-500/20 bg-teal-500/10 p-2 font-bold text-teal-700 dark:text-teal-300">
              <span className="text-[11px]">استقرار نقاط البيع (POS):</span>
              <span className="font-mono">100% بدون توقف</span>
            </div>
          </div>
        </div>

        {/* Service 6: Storage & Database Health */}
        <div className="space-y-3 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-500/10 text-slate-600">
                <Database size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black text-[var(--app-text)]">
                  قاعدة البيانات والتخزين (Postgres)
                </h3>
                <span className="text-[10px] font-bold text-slate-600">
                  محرك Postgres 17 عالي الاعتمادية
                </span>
              </div>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] p-2">
              <span className="text-[11px] text-[var(--app-text-secondary)]">موقع الخادم:</span>
              <span className="font-bold text-[var(--app-text)]">ap-south-1 (Mumbai)</span>
            </div>
            <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] p-2">
              <span className="text-[11px] text-[var(--app-text-secondary)]">
                تزامن المخطط (Migrations):
              </span>
              <span className="font-bold text-emerald-600">مكتمل 100%</span>
            </div>
            <div className="flex justify-between rounded-lg border border-slate-500/20 bg-slate-500/10 p-2 font-bold text-slate-700 dark:text-slate-300">
              <span className="text-[11px]">نسخ احتياطي ذري (PITR):</span>
              <span className="font-mono">مفعل تلقائياً</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
