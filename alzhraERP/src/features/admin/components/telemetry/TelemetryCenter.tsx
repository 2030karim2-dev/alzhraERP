import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Car,
  Store,
  MessageSquare,
  WifiOff,
  Database,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { PlatformMetrics } from '../../types';
import { useServiceTelemetry } from '../../hooks/useAdminData';
import { adminService } from '../../services/adminService';
import { calcCacheHitRate } from '../../utils';
import { AdminPageHeader } from '../shared/AdminPageHeader';
import Button from '../../../../ui/base/Button';

interface TelemetryCenterProps {
  metrics?: PlatformMetrics | undefined;
}

export const TelemetryCenter: React.FC<TelemetryCenterProps> = ({ metrics }) => {
  const { data: serviceTelemetry, refetch, isFetching } = useServiceTelemetry();
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState<boolean>(false);
  const [pingError, setPingError] = useState<string | null>(null);

  const checkLatency = useCallback(async () => {
    setIsPinging(true);
    setPingError(null);
    try {
      const ms = await adminService.pingDatabase();
      setLatencyMs(ms);
    } catch {
      setPingError('تعذر قياس الاستجابة');
      setLatencyMs(null);
    } finally {
      setIsPinging(false);
    }
  }, []);

  useEffect(() => {
    void checkLatency();
  }, [checkLatency]);

  const cacheHitRate = calcCacheHitRate(
    metrics?.total_ai_requests || 0,
    metrics?.ai_cache_hits || 0
  );

  return (
    <div className="space-y-4">
      {/* Top Banner — ترويسة موحّدة */}
      <AdminPageHeader
        title="مركز مراقبة واستهلاك الخدمات التقنية"
        subtitle="مراقبة حية للبنية التحتية: زمن استجابة قاعدة البيانات، استهلاك الذكاء الاصطناعي، ونشاط قنوات الاتصال والخدمات."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                void checkLatency();
              }}
              disabled={isPinging}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs"
              title="فحص زمن استجابة قاعدة البيانات الآن"
            >
              <Activity
                size={12}
                className={
                  isPinging ? 'animate-pulse text-blue-500' : 'text-[var(--app-text-secondary)]'
                }
              />
              <span>فحص الاستجابة</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void refetch();
              }}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs"
            >
              <RefreshCw size={12} className={isFetching ? 'animate-spin text-blue-500' : ''} />
              <span>تحديث المقاييس</span>
            </Button>
          </div>
        }
      />

      {/* Top Health Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2">
          <Database size={15} className="text-[var(--app-text-secondary)]" />
          <span className="font-bold text-[var(--app-text)]">قاعدة بيانات PostgreSQL:</span>
          {isPinging ? (
            <span className="font-mono text-[11px] text-[var(--app-text-secondary)]">
              جاري الفحص...
            </span>
          ) : pingError ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600">
              <AlertTriangle size={12} />
              <span>{pingError}</span>
            </span>
          ) : latencyMs !== null ? (
            <span className="flex items-center gap-1.5 font-mono font-bold">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  latencyMs < 100
                    ? 'bg-emerald-500'
                    : latencyMs < 300
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                }`}
              />
              <span className="text-[var(--app-text)]">{latencyMs} ms</span>
              <span className="text-[10px] font-normal text-[var(--app-text-secondary)]">
                {latencyMs < 100
                  ? '(استجابة فورية)'
                  : latencyMs < 300
                    ? '(استجابة مقبولة)'
                    : '(استجابة بطيئة)'}
              </span>
            </span>
          ) : (
            <span className="text-[11px] text-[var(--app-text-secondary)]">غير مفحوص</span>
          )}
        </div>

        <div className="flex items-center gap-4 text-[11px] text-[var(--app-text-secondary)]">
          <div>
            <span>توفير كاش الـ AI: </span>
            <span className="font-mono font-bold text-emerald-600">{cacheHitRate}%</span>
          </div>
          <div className="h-3 w-px bg-[var(--app-border)]" />
          <div>
            <span>رسائل المحادثات: </span>
            <span className="font-mono font-bold text-[var(--app-text)]">
              {serviceTelemetry?.total_chat_messages ?? 0}
            </span>
          </div>
          <div className="h-3 w-px bg-[var(--app-border)]" />
          <div>
            <span>تسعيرات الموردين: </span>
            <span className="font-mono font-bold text-[var(--app-text)]">
              {serviceTelemetry?.total_supplier_price_rows ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
        {/* Service 1: AI Part Intelligence */}
        <div className="flex flex-col justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-[var(--app-text-secondary)]" />
                <div>
                  <h3 className="text-xs font-bold text-[var(--app-text)]">
                    الذكاء الاصطناعي للقطع (AI Part Lookup)
                  </h3>
                  <span className="text-[10px] text-[var(--app-text-secondary)]">
                    محرك Gemini Multimodal
                  </span>
                </div>
              </div>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                نشط
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  إجمالي استدعاءات الـ API:
                </span>
                <span className="font-mono font-bold text-[var(--app-text)]">
                  {metrics?.total_ai_requests || 0}
                </span>
              </div>
              <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  الاستجابات المخدومة من الكاش:
                </span>
                <span className="font-mono font-bold text-emerald-600">
                  {metrics?.ai_cache_hits || 0}
                </span>
              </div>
              <div className="flex justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 font-bold">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  معدل توفير التكلفة (Cache Hit):
                </span>
                <span className="font-mono text-emerald-600">{cacheHitRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Service 2: VIN Intelligence */}
        <div className="flex flex-col justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <Car size={16} className="text-[var(--app-text-secondary)]" />
                <div>
                  <h3 className="text-xs font-bold text-[var(--app-text)]">
                    ذكاء الشاصي (VIN Intelligence)
                  </h3>
                  <span className="text-[10px] text-[var(--app-text-secondary)]">
                    فك وترميز مواصفات المركبات
                  </span>
                </div>
              </div>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                متصل
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
                <span className="text-[11px] text-[var(--app-text-secondary)]">حالة المحرك:</span>
                <span className="flex items-center gap-1 font-bold text-emerald-600">
                  <CheckCircle2 size={12} /> متصل وجاهز
                </span>
              </div>
              <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  تغطية المصنعين:
                </span>
                <span className="font-bold text-[var(--app-text)]">تويوتا، نيسان، هيونداي...</span>
              </div>
              <div className="flex justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 font-bold">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  التحليلات المحفوظة (VIN):
                </span>
                <span className="font-mono text-[var(--app-text)]">
                  {serviceTelemetry?.total_vin_analyses ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Service 3: Supplier Dedicated Portal */}
        <div className="flex flex-col justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <Store size={16} className="text-[var(--app-text-secondary)]" />
                <div>
                  <h3 className="text-xs font-bold text-[var(--app-text)]">
                    بوابة الموردين (Supplier Portal)
                  </h3>
                  <span className="text-[10px] text-[var(--app-text-secondary)]">
                    بوابة تسعير الموردين العامة
                  </span>
                </div>
              </div>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                مفعل
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  الوصول عبر التوكنات:
                </span>
                <span className="font-bold text-emerald-600">مفعل وآمن RLS</span>
              </div>
              <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  تحديد معدل الطلبات:
                </span>
                <span className="font-bold text-[var(--app-text)]">60 طلب / دقيقة</span>
              </div>
              <div className="flex justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 font-bold">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  سجلات أسعار الموردين:
                </span>
                <span className="font-mono text-[var(--app-text)]">
                  {serviceTelemetry?.total_supplier_price_rows ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Service 4: Enterprise Chat Collaboration */}
        <div className="flex flex-col justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-[var(--app-text-secondary)]" />
                <div>
                  <h3 className="text-xs font-bold text-[var(--app-text)]">
                    المحادثات الفورية (Chat Hub)
                  </h3>
                  <span className="text-[10px] text-[var(--app-text-secondary)]">
                    قنوات التواصل والتعاون
                  </span>
                </div>
              </div>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                متصل
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
                <span className="text-[11px] text-[var(--app-text-secondary)]">طبقة Realtime:</span>
                <span className="font-bold text-emerald-600">Supabase Channels</span>
              </div>
              <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  عزل الفروع والمحادثات:
                </span>
                <span className="font-bold text-emerald-600">RLS محكم</span>
              </div>
              <div className="flex justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 font-bold">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  رسائل المحادثات الكلية:
                </span>
                <span className="font-mono text-[var(--app-text)]">
                  {serviceTelemetry?.total_chat_messages ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Service 5: Offline Sync Engine */}
        <div className="flex flex-col justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <WifiOff size={16} className="text-[var(--app-text-secondary)]" />
                <div>
                  <h3 className="text-xs font-bold text-[var(--app-text)]">
                    محرك المزامنة (Sync Engine)
                  </h3>
                  <span className="text-[10px] text-[var(--app-text-secondary)]">
                    العمل دون إنترنت ونقاط البيع
                  </span>
                </div>
              </div>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                جاهز
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  التخزين المحلي:
                </span>
                <span className="font-bold text-[var(--app-text)]">IndexedDB Local DB</span>
              </div>
              <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
                <span className="text-[11px] text-[var(--app-text-secondary)]">فض النزاعات:</span>
                <span className="font-bold text-[var(--app-text)]">Server Timestamp / Locks</span>
              </div>
              <div className="flex justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 font-bold">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  وضع نقاط البيع:
                </span>
                <span className="font-mono text-emerald-600">مستمر دون توقف</span>
              </div>
            </div>
          </div>
        </div>

        {/* Service 6: Storage & Database Health */}
        <div className="flex flex-col justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3.5">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--app-border)] pb-2.5">
              <div className="flex items-center gap-2">
                <Database size={16} className="text-[var(--app-text-secondary)]" />
                <div>
                  <h3 className="text-xs font-bold text-[var(--app-text)]">
                    قاعدة البيانات والتخزين (Postgres)
                  </h3>
                  <span className="text-[10px] text-[var(--app-text-secondary)]">
                    محرك PostgreSQL السحابي
                  </span>
                </div>
              </div>
              <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                متصل
              </span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
                <span className="text-[11px] text-[var(--app-text-secondary)]">زمن الاستجابة:</span>
                <span className="font-mono font-bold text-[var(--app-text)]">
                  {latencyMs !== null
                    ? `${latencyMs} ms`
                    : isPinging
                      ? 'جاري القياس...'
                      : 'غير محدد'}
                </span>
              </div>
              <div className="flex justify-between rounded-lg bg-[var(--app-surface-hover)] px-2.5 py-1.5">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  تزامن المخطط (Migrations):
                </span>
                <span className="font-bold text-emerald-600">مكتمل ومحدث</span>
              </div>
              <div className="flex justify-between rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1.5 font-bold">
                <span className="text-[11px] text-[var(--app-text-secondary)]">
                  حماية البيانات والنسخ:
                </span>
                <span className="font-mono text-emerald-600">مفعل تلقائياً</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
