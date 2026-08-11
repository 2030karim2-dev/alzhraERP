import { logger } from '../../../core/utils/logger';

import { useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import type { VehicleConfiguration, VehicleCorePart, InventoryMatch, DemandInsight } from '../types';

// ============================================================
// Types
// ============================================================
export type TabStep = 'validate-decode' | 'knowledge' | 'parts' | 'inventory' | 'audit';
export type TabStatus = 'idle' | 'locked' | 'loading' | 'success' | 'error';

export interface TabState { id: TabStep; label: string; labelKey: string; status: TabStatus; error: string | null; }

export interface VinAccumulatedData {
  vin: string; normalizedVin: string; vehicle: VehicleConfiguration | null;
  vkbId: string | null; vehicleIsNew: boolean; coreParts: VehicleCorePart[];
  inventoryMatches: InventoryMatch[]; missingParts: VehicleCorePart[]; demandInsights: DemandInsight[];
}

interface UseVinTabsReturn {
  tabs: TabState[]; activeTab: number; setActiveTab: (idx: number) => void;
  accumulatedData: VinAccumulatedData; runStep: (step: TabStep) => Promise<void>;
  runAllSteps: (vin: string) => Promise<void>; retryStep: (step: TabStep) => Promise<void>;
  reset: () => void; isAnyLoading: boolean;
}

const TAB_DEFS: { id: TabStep; label: string; labelKey: string }[] = [
  { id: 'validate-decode', label: 'التحقق وتحديد المركبة', labelKey: 'vin_tab_validate' },
  { id: 'knowledge', label: 'قاعدة المعرفة', labelKey: 'vin_tab_knowledge' },
  { id: 'parts', label: 'القطع الرئيسية', labelKey: 'vin_tab_parts' },
  { id: 'inventory', label: 'المخزون والتوريد', labelKey: 'vin_tab_inventory' },
  { id: 'audit', label: 'سجل التحليل', labelKey: 'vin_tab_audit' },
];

const EMPTY_DATA: VinAccumulatedData = {
  vin: '', normalizedVin: '', vehicle: null, vkbId: null, vehicleIsNew: false,
  coreParts: [], inventoryMatches: [], missingParts: [], demandInsights: [],
};

export function useVinTabs(): UseVinTabsReturn {
  const [tabs, setTabs] = useState<TabState[]>(TAB_DEFS.map(t => ({ ...t, status: 'idle', error: null })));
  const [activeTab, setActiveTab] = useState(0);
  const [accData, setAccData] = useState<VinAccumulatedData>(EMPTY_DATA);
  const abortRef = useRef<AbortController | null>(null);
  const dataRef = useRef<VinAccumulatedData>(accData);
  dataRef.current = accData; // always fresh

  const updateTab = useCallback((step: TabStep, patch: Partial<TabState>) =>
    setTabs(prev => prev.map(t => t.id === step ? { ...t, ...patch } : t)), []);

  const isAnyLoading = useMemo(() => tabs.some(t => t.status === 'loading'), [tabs]);

  const invoke = useCallback(async (step: string, body: Record<string, unknown>) => {
    const ctrl = new AbortController(); abortRef.current?.abort(); abortRef.current = ctrl;

    // Helper: try to get a valid session (with proactive refresh)
    const ensureSession = async (): Promise<boolean> => {
      const { data: s } = await supabase.auth.getSession();
      if (s?.session?.access_token) return true;
      // Session missing/expired — try silent refresh
      try {
        const { data: ref } = await supabase.auth.refreshSession();
        return !!(ref?.session?.access_token);
      } catch { return false; }
    };

    if (!(await ensureSession())) throw new Error('انتهت الجلسة.');

    const makeRequest = async () => {
      const { data: d, error: e } = await supabase.functions.invoke('vin-analyze', {
        body: { step, ...body }, signal: ctrl.signal,
      });
      return { data: d, error: e };
    };

    let { data: d, error: e } = await makeRequest();

    if (e) {
      // Detect 401 from ANY error shape (FunctionsHttpError, FunctionsRelayError, or plain)
      const status = (e as any)?.context?.status || (e as any)?.status || 0;
      const is401 = status === 401 || String(e).includes('401') || String(e).includes('Unauthorized');

      if (e.name === 'AbortError') throw e;

      if (is401) {
        // Try session refresh + one retry
        logger.warn('VIN', '401 detected, attempting session refresh', { step, status });
        try {
          const { data: ref } = await supabase.auth.refreshSession();
          if (ref?.session) {
            ({ data: d, error: e } = await makeRequest());
            if (!e && d) return d;
          }
        } catch (refreshErr) {
          logger.error('VIN', 'Session refresh failed', refreshErr);
        }
        throw new Error('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.');
      }
      // Non-401 error — throw with message
      throw new Error((e as any)?.message || `خطأ ${status || ''}`.trim() || 'فشل الاتصال.');
    }

    if (d?.status !== 'SUCCESS') {
      // Map known Edge Function statuses to user-friendly Arabic messages
      const STATUS_MESSAGES: Record<string, string> = {
        DECODER_TIMEOUT: 'انتهت مهلة الاتصال بخدمة فك ترميز VIN. حاول مرة أخرى.',
        DECODER_UNAVAILABLE: 'خدمة فك ترميز VIN غير متاحة حالياً. حاول لاحقاً.',
        DECODER_RATE_LIMITED: 'تم تجاوز حد الطلبات على خدمة فك الترميز. انتظر قليلاً ثم حاول مجدداً.',
        VIN_NOT_FOUND: 'لم يتم العثور على بيانات لهذا الرقم في قاعدة NHTSA (قد تكون المركبة غير أمريكية).',
        NO_COMPANY: 'حسابك غير مرتبط بشركة. تواصل مع مسؤول النظام.',
        UNAUTHORIZED: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.',
      };
      throw new Error(STATUS_MESSAGES[d?.status] || d?.errorDetail || d?.status || 'فشلت العملية.');
    }
    return d;
  }, []);

  // runStep reads from dataRef — always latest, no stale closure
  const runStep = useCallback(async (step: TabStep) => {
    updateTab(step, { status: 'loading', error: null });
    try {
      const d = dataRef.current; let r: any;
      switch (step) {
        case 'validate-decode':
          if (!d.normalizedVin) throw new Error('الرجاء إدخال VIN.'); r = await invoke('validate-decode', { vin: d.normalizedVin });
          setAccData(p => ({ ...p, vin: r.vin, vehicle: r.vehicle }));
          setTabs(p => p.map(t => t.id === 'knowledge' && t.status === 'locked' ? { ...t, status: 'idle' } : t)); break;
        case 'knowledge':
          if (!d.vehicle) throw new Error('يجب تحديد المركبة.'); r = await invoke('knowledge', { vin: d.normalizedVin, previousResults: { vehicle: d.vehicle } });
          setAccData(p => ({ ...p, vkbId: r.vkbId, vehicleIsNew: r.vehicleIsNew }));
          setTabs(p => p.map(t => t.id === 'parts' && t.status === 'locked' ? { ...t, status: 'idle' } : t)); break;
        case 'parts':
          if (!d.vkbId) throw new Error('يجب بناء قاعدة المعرفة.'); r = await invoke('parts', { previousResults: { vkbId: d.vkbId } });
          setAccData(p => ({ ...p, coreParts: r.coreParts || [] }));
          setTabs(p => p.map(t => t.id === 'inventory' && t.status === 'locked' ? { ...t, status: 'idle' } : t)); break;
        case 'inventory':
          if (!d.coreParts.length) throw new Error('يجب تحميل القطع.'); r = await invoke('inventory', { previousResults: { coreParts: d.coreParts } });
          setAccData(p => ({ ...p, inventoryMatches: r.matches || [], missingParts: r.missingParts || [], demandInsights: r.demandInsights || [] }));
          setTabs(p => p.map(t => t.id === 'audit' && t.status === 'locked' ? { ...t, status: 'idle' } : t)); break;
        case 'audit':
          r = await invoke('audit', { vin: d.normalizedVin, previousResults: { vin: d.normalizedVin, vehicle: d.vehicle, inventory: { partsFound: d.coreParts.length, inStockCount: d.inventoryMatches.length } } }); break;
      }
      updateTab(step, { status: 'success' });
    } catch (err) { updateTab(step, { status: 'error', error: err instanceof Error ? err.message : 'حدث خطأ.' }); }
  }, [invoke, updateTab]);

  const runAllSteps = useCallback(async (vin: string) => {
    const n = (vin || '').replace(/[\s\-]/g, '').toUpperCase(); if (!n) return;
    setAccData({ ...EMPTY_DATA, vin, normalizedVin: n });
    setTabs(TAB_DEFS.map((t, i) => ({ ...t, status: i === 0 ? 'idle' : 'locked', error: null })));
    setActiveTab(0);
    await runStep('validate-decode');
  }, [runStep]);

  const retryStep = useCallback(async (step: TabStep) => { await runStep(step); }, [runStep]);
  const reset = useCallback(() => { abortRef.current?.abort(); setTabs(TAB_DEFS.map(t => ({ ...t, status: 'idle' as TabStatus, error: null }))); setAccData(EMPTY_DATA); setActiveTab(0); }, []);

  return { tabs, activeTab, setActiveTab, accumulatedData: accData, runStep, runAllSteps, retryStep, reset, isAnyLoading };
}

