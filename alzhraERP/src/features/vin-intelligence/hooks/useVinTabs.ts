import { logger } from '../../../core/utils/logger';

import { useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuthSession } from '../../../core/hooks/useAuthSession';
import type { VehicleConfiguration, VehicleCorePart, InventoryMatch, DemandInsight } from '../types';

// ============================================================
// Types
// ============================================================
export type TabStep = 'validate' | 'identify' | 'analyze' | 'parts' | 'oem' | 'knowledge' | 'inventory';
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
  { id: 'validate', label: 'التحقق من VIN', labelKey: 'vin_step_validate' },
  { id: 'identify', label: 'تحديد المركبة', labelKey: 'vin_step_identify' },
  { id: 'analyze', label: 'تحليل البيانات', labelKey: 'vin_step_analyze' },
  { id: 'parts', label: 'القطع الرئيسية', labelKey: 'vin_step_parts' },
  { id: 'oem', label: 'مطابقة OEM', labelKey: 'vin_step_oem' },
  { id: 'knowledge', label: 'قاعدة المعرفة', labelKey: 'vin_step_knowledge' },
  { id: 'inventory', label: 'المخزون', labelKey: 'vin_step_inventory' },
];

const EMPTY_DATA: VinAccumulatedData = {
  vin: '', normalizedVin: '', vehicle: null, vkbId: null, vehicleIsNew: false,
  coreParts: [], inventoryMatches: [], missingParts: [], demandInsights: [],
};

export function useVinTabs(): UseVinTabsReturn {
  const { ensureValidSession } = useAuthSession();
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

    const { userId } = await ensureValidSession();
    if (!userId) {
       console.warn('[VIN] No active session detected before invoke');
    }

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
        case 'validate':
          if (!d.normalizedVin) throw new Error('الرجاء إدخال VIN.'); 
          r = await invoke('validate', { vin: d.normalizedVin });
          setAccData(p => ({ ...p, vin: r.vin }));
          break;
        case 'identify':
          if (!d.normalizedVin) throw new Error('يجب التحقق من VIN أولاً.');
          r = await invoke('identify', { vin: d.normalizedVin });
          setAccData(p => ({ ...p, vehicle: r.vehicle }));
          break;
        case 'analyze':
          if (!d.vehicle) throw new Error('يجب تحديد المركبة أولاً.');
          r = await invoke('analyze', { vin: d.normalizedVin, vehicle: d.vehicle });
          // We keep the vehicle data updated with any deep specs found
          if (r.vehicle) setAccData(p => ({ ...p, vehicle: { ...p.vehicle, ...r.vehicle } }));
          break;
        case 'parts':
          if (!d.vehicle) throw new Error('يجب تحديد المركبة أولاً.');
          r = await invoke('parts', { vin: d.normalizedVin, vehicle: d.vehicle });
          setAccData(p => ({ ...p, coreParts: r.coreParts || [] }));
          break;
        case 'oem':
          if (!d.coreParts.length) throw new Error('يجب البحث عن القطع أولاً.');
          // OEM matching is often part of the 'parts' or 'analyze' step, but here we link it to the coreParts in state
          r = await invoke('oem', { vin: d.normalizedVin, coreParts: d.coreParts });
          if (r.updatedParts) setAccData(p => ({ ...p, coreParts: r.updatedParts }));
          break;
        case 'knowledge':
          if (!d.vehicle) throw new Error('يجب تحديد المركبة أولاً.');
          r = await invoke('knowledge', { vin: d.normalizedVin, vehicle: d.vehicle, coreParts: d.coreParts });
          setAccData(p => ({ ...p, vkbId: r.vkbId, vehicleIsNew: r.vehicleIsNew }));
          break;
        case 'inventory':
          if (!d.coreParts.length) throw new Error('يجب تحميل القطع أولاً.');
          // REAL INTEGRATION: Link core parts with company inventory
          r = await invoke('inventory', { vin: d.normalizedVin, coreParts: d.coreParts });
          setAccData(p => ({ ...p, inventoryMatches: r.inventoryMatches || [], missingParts: r.missingParts || [], demandInsights: r.demandInsights || [] }));
          break;
      }
      
      // Unlock next tab
      const currentIdx = tabs.findIndex(t => t.id === step);
      if (currentIdx < tabs.length - 1) {
        setTabs(prev => prev.map((t, i) => i === currentIdx + 1 && t.status === 'locked' ? { ...t, status: 'idle' } : t));
      }
      updateTab(step, { status: 'success' });
    } catch (err) { updateTab(step, { status: 'error', error: err instanceof Error ? err.message : 'حدث خطأ.' }); }
  }, [invoke, updateTab]);

  const runAllSteps = useCallback(async (vin: string) => {
    const n = (vin || '').replace(/[\s\-]/g, '').toUpperCase(); if (!n) return;
    setAccData({ ...EMPTY_DATA, vin, normalizedVin: n });
    setTabs(TAB_DEFS.map((t, i) => ({ ...t, status: i === 0 ? 'idle' : 'locked', error: null })));
    setActiveTab(0);
    await runStep('validate');
  }, [runStep]);

  const retryStep = useCallback(async (step: TabStep) => { await runStep(step); }, [runStep]);
  const reset = useCallback(() => { abortRef.current?.abort(); setTabs(TAB_DEFS.map(t => ({ ...t, status: 'idle' as TabStatus, error: null }))); setAccData(EMPTY_DATA); setActiveTab(0); }, []);

  return { tabs, activeTab, setActiveTab, accumulatedData: accData, runStep, runAllSteps, retryStep, reset, isAnyLoading };
}

