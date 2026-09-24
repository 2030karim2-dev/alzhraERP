/**
 * Debt & Collection module — query hooks.
 * Data fetching only; no business computation in the frontend.
 *
 * كل الاستعلامات تمر عبر مصنع واحد (`useDebtQuery`) يوحّد:
 * مفتاح `['debts', scope, companyId, ...extra]` + بوابة وجود company_id
 * + الزمن المخزَّن (staleTime) — بلا تكرار وبلا شروط nullable ضمنية.
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useAuthStore } from '../../auth/store';
import { debtsService } from '../services/debtService';
import { debtApi, debtMessageApi, EMPTY_CHANNEL_CONFIG } from '../api/debtApi';
import { useBranchFilter } from '../../branches/hooks/useBranchFilter';
import type {
  DebtAnalytics,
  DebtFollowupConfig,
  DebtMessageLogWithParty,
  DebtMessageTemplate,
  FollowUpDashboardRow,
  PartyDebtOverview,
  PartyOpeningBalance,
  DebtChannelConfig,
  DebtCollector,
  DebtFollowupAction,
  DebtTaskQueueRow,
  PartyTimelineEntry,
  PaymentPromiseWithParty,
  TodayTask,
} from '../types';

const STALE_TIME = 60 * 1000; // 1 min — debt data changes with every payment

const useCompanyId = (): string | undefined => {
  const { user } = useAuthStore();
  return user?.company_id;
};

/** جزء إضافي في مفتاح الاستعلام (فرع/فلتر/معرّف طرف). */
type DebtKeyPart = string | number | boolean | null | undefined;

interface DebtQuerySpec<T> {
  /** اسم النطاق بعد 'debts' في المفتاح (dashboard/promises/...). */
  scope: string;
  /** بقية أجزاء المفتاح بعد company_id. */
  extra?: readonly DebtKeyPart[];
  /** يُستدعى فقط عند توفّر company_id (الاستعلام معطّل بدونه). */
  fetcher: (companyId: string) => Promise<T>;
  /** قيمة احتياطية حين لا تتوفّر جلسة/منشأة. */
  empty: T;
  /** شرط تفعيل إضافي بجانب وجود المنشأة (مثل وجود partyId). */
  enabled?: boolean;
  staleTime?: number;
}

/**
 * مصنع استعلامات الديون — المفتاح مطابق تماماً للتخطيط السابق، لذا إبطال
 * `['debts']` (Prefix) في useDebtMutations يشمل كل هذه الاستعلامات.
 */
const useDebtQuery = <T>({
  scope,
  extra = [],
  fetcher,
  empty,
  enabled = true,
  staleTime = STALE_TIME,
}: DebtQuerySpec<T>): UseQueryResult<T> => {
  const companyId = useCompanyId();
  const hasCompany = companyId !== undefined && companyId !== '';
  return useQuery({
    queryKey: ['debts', scope, companyId, ...extra],
    queryFn: () =>
      companyId !== undefined && companyId !== '' ? fetcher(companyId) : Promise.resolve(empty),
    enabled: hasCompany && enabled,
    staleTime,
  });
};

export const useDebtDashboard = (): UseQueryResult<FollowUpDashboardRow[]> => {
  const { branchId } = useBranchFilter();
  return useDebtQuery<FollowUpDashboardRow[]>({
    scope: 'dashboard',
    extra: [branchId],
    empty: [],
    fetcher: companyId => debtsService.getDashboard(companyId, branchId),
  });
};

export const useDebtAnalytics = (): UseQueryResult<DebtAnalytics | null> => {
  const { branchId } = useBranchFilter();
  return useDebtQuery<DebtAnalytics | null>({
    scope: 'analytics',
    extra: [branchId],
    empty: null,
    fetcher: companyId => debtsService.getAnalytics(companyId, branchId),
  });
};

export const useDebtTodayTasks = (): UseQueryResult<TodayTask[]> => {
  const { branchId } = useBranchFilter();
  return useDebtQuery<TodayTask[]>({
    scope: 'today_tasks',
    extra: [branchId],
    empty: [],
    fetcher: companyId => debtsService.getTodayTasks(companyId, branchId),
  });
};

/**
 * S1: الإجراءات المجدولة المستحقة (customer_activities.pending).
 * تُغلق فجوة «الكتابة بلا قارئ»: الإجراء التالي المكتوب من
 * log_collection_activity لم تكن أي شاشة تعرضه، فتضيع مواعيد المتابعة.
 */
export const useDebtFollowupActions = (): UseQueryResult<DebtFollowupAction[]> => {
  const { branchId } = useBranchFilter();
  return useDebtQuery<DebtFollowupAction[]>({
    scope: 'followup_actions',
    extra: [branchId],
    empty: [],
    staleTime: 30 * 1000,
    fetcher: companyId => debtsService.getFollowupActions(companyId, branchId),
  });
};

/** فلاتر طابور المهام (المحصّل/النافذة/الحد). */
export interface DebtTaskQueueFilters {
  collectorId?: string | null;
  windowDays?: number;
  limit?: number;
}

/**
 * S2: طابور المهام الموحّد — كل الالتزامات (فواتير/وعود/إجراءات/حرج/فاشل)
 * مع المسؤول ومرحلة التصعيد. `collectorId` يحوّله إلى «عملائي».
 */
export const useDebtTaskQueue = (
  filters: DebtTaskQueueFilters = {}
): UseQueryResult<DebtTaskQueueRow[]> => {
  const { branchId } = useBranchFilter();
  const windowDays = filters.windowDays ?? 7;
  const limit = filters.limit ?? 200;
  const collectorId = filters.collectorId ?? null;
  return useDebtQuery<DebtTaskQueueRow[]>({
    scope: 'task_queue',
    extra: [branchId, collectorId ?? '', windowDays, limit],
    empty: [],
    staleTime: 30 * 1000,
    fetcher: companyId =>
      debtsService.getTaskQueue(companyId, { branchId, collectorId, windowDays, limit }),
  });
};

/** S3: إعدادات قنوات الإرسال (واتساب + SMS). */
export const useDebtChannelConfig = (): UseQueryResult<DebtChannelConfig> =>
  useDebtQuery<DebtChannelConfig>({
    scope: 'channel_config',
    empty: EMPTY_CHANNEL_CONFIG,
    staleTime: 5 * 60 * 1000,
    fetcher: companyId => debtsService.getChannelConfig(companyId),
  });

/** S2: قائمة المحصّلين (أعضاء المنشأة) لقوائم الإسناد. */
export const useDebtCollectors = (): UseQueryResult<DebtCollector[]> =>
  useDebtQuery<DebtCollector[]>({
    scope: 'collectors',
    empty: [],
    staleTime: 5 * 60 * 1000,
    fetcher: companyId => debtsService.getCollectors(companyId),
  });

export const useDebtPromises = (filters?: {
  partyId?: string;
  status?: string;
}): UseQueryResult<PaymentPromiseWithParty[]> => {
  const { branchId } = useBranchFilter();
  return useDebtQuery<PaymentPromiseWithParty[]>({
    scope: 'promises',
    extra: [branchId, filters?.partyId ?? '', filters?.status ?? ''],
    empty: [],
    fetcher: companyId => debtApi.getPromises(companyId, { ...filters, branchId }),
  });
};

export const useDebtTemplates = (activeOnly = true): UseQueryResult<DebtMessageTemplate[]> =>
  useDebtQuery<DebtMessageTemplate[]>({
    scope: 'templates',
    extra: [activeOnly],
    empty: [],
    staleTime: 5 * 60 * 1000,
    fetcher: companyId => debtMessageApi.getTemplates(companyId, activeOnly),
  });

export const useDebtMessageLog = (status?: string): UseQueryResult<DebtMessageLogWithParty[]> =>
  useDebtQuery<DebtMessageLogWithParty[]>({
    scope: 'message_log',
    extra: [status ?? ''],
    empty: [],
    fetcher: companyId => debtMessageApi.getMessageLog(companyId, status),
  });

/**
 * عدد الرسائل الفاشلة على مستوى المنشأة (HEAD count) — رقم صادق لا يتأثر
 * بحد 200 صفاً في قائمة الصادر ولا بفلتر الحالة المعروض.
 */
export const useDebtFailedMessagesCount = (): UseQueryResult<number> =>
  useDebtQuery<number>({
    scope: 'message_log_failed_count',
    empty: 0,
    fetcher: companyId => debtMessageApi.countByStatus(companyId, 'failed'),
  });

export const useDebtPartyOverview = (
  partyId: string | null
): UseQueryResult<PartyDebtOverview | null> =>
  useDebtQuery<PartyDebtOverview | null>({
    scope: 'party_overview',
    extra: [partyId],
    empty: null,
    enabled: partyId !== null && partyId !== '',
    fetcher: companyId =>
      partyId !== null && partyId !== ''
        ? debtsService.getPartyOverview(companyId, partyId)
        : Promise.resolve(null),
  });

export const useDebtFollowupConfig = (): UseQueryResult<DebtFollowupConfig | null> =>
  useDebtQuery<DebtFollowupConfig | null>({
    scope: 'followup_config',
    empty: null,
    staleTime: 5 * 60 * 1000,
    fetcher: companyId => debtApi.getFollowupConfig(companyId),
  });

export const useDebtOpeningBalances = (partyId?: string): UseQueryResult<PartyOpeningBalance[]> =>
  useDebtQuery<PartyOpeningBalance[]>({
    scope: 'opening_balances',
    extra: [partyId ?? ''],
    empty: [],
    fetcher: companyId => debtMessageApi.getOpeningBalances(companyId, partyId),
  });

/** Phase 2A: الخط الزمني لآخر أنشطة تحصيل الطرف (يُبطل تلقائياً بعد تسجيل نشاط). */
export const usePartyTimeline = (partyId: string | null): UseQueryResult<PartyTimelineEntry[]> =>
  useDebtQuery<PartyTimelineEntry[]>({
    scope: 'timeline',
    extra: [partyId ?? ''],
    empty: [],
    enabled: partyId !== null && partyId !== '',
    staleTime: 30 * 1000, // 30s — نشاط قريب ثم إدخاله يظهر فوراً بعد التسجيل
    fetcher: companyId =>
      partyId !== null && partyId !== ''
        ? debtsService.getPartyTimeline(companyId, partyId)
        : Promise.resolve([]),
  });
