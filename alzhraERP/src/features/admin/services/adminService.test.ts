import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from './adminService';
import { supabase } from '../../../lib/supabaseClient';

vi.mock('../../../lib/supabaseClient', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

describe('adminService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getMetrics', () => {
    it('calls get_platform_system_metrics RPC and returns data', async () => {
      const mockMetrics = {
        total_companies: 10,
        active_companies: 8,
        trial_companies: 2,
        suspended_companies: 0,
        total_users: 25,
        total_invoices: 150,
        today_invoices: 12,
        total_ai_requests: 300,
        ai_cache_hits: 180,
        honeypot_alerts: 0,
        csp_reports: 0,
        fetched_at: '2026-09-03T12:00:00Z',
      };

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockMetrics,
        error: null,
      } as any);

      const result = await adminService.getMetrics();
      expect(supabase.rpc).toHaveBeenCalledWith('get_platform_system_metrics');
      expect(result).toEqual(mockMetrics);
    });

    it('throws error if RPC returns an error', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: null,
        error: new Error('Permission denied'),
      } as any);

      await expect(adminService.getMetrics()).rejects.toThrow('Permission denied');
    });
  });

  describe('getCompanies', () => {
    it('passes search, status, and pagination parameters to get_admin_companies_list', async () => {
      const mockCompanies = [
        {
          id: 'comp-1',
          name_ar: 'شركة النور',
          name_en: 'Al Noor Co',
          tax_number: '1234567890',
          base_currency: 'SAR',
          owner_id: 'user-1',
          owner_email: 'owner@alnoor.com',
          phone: '0501234567',
          is_active: true,
          subscription_status: 'active',
          trial_ends_at: null,
          plan_id: 'plan-1',
          plan_name: 'الباقة المتقدمة',
          user_count: 5,
          branch_count: 2,
          invoice_count: 45,
          created_at: '2026-08-01T00:00:00Z',
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockCompanies,
        error: null,
      } as any);

      const result = await adminService.getCompanies({
        search: '  النور  ',
        status: 'active',
        limit: 25,
        offset: 0,
      });

      expect(supabase.rpc).toHaveBeenCalledWith('get_admin_companies_list', {
        p_search: 'النور',
        p_status: 'active',
        p_limit: 25,
        p_offset: 0,
      });
      expect(result).toEqual(mockCompanies);
    });
  });

  describe('toggleCompanyStatus', () => {
    it('calls toggle_company_status RPC with parameters', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as any);

      const result = await adminService.toggleCompanyStatus('comp-1', false, 'suspended');
      expect(supabase.rpc).toHaveBeenCalledWith('toggle_company_status', {
        p_company_id: 'comp-1',
        p_is_active: false,
        p_status: 'suspended',
      });
      expect(result).toBe(true);
    });
  });

  describe('extendTrial', () => {
    it('calls extend_company_trial RPC and returns new expiry and status', async () => {
      const mockResult = {
        trial_ends_at: '2026-10-01T00:00:00Z',
        subscription_status: 'trial',
      };
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockResult,
        error: null,
      } as any);

      const result = await adminService.extendTrial('comp-1', 14);
      expect(supabase.rpc).toHaveBeenCalledWith('extend_company_trial', {
        p_company_id: 'comp-1',
        p_days: 14,
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe('updateSystemConfig', () => {
    it('calls admin_update_system_config RPC with key and value', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as any);

      await adminService.updateSystemConfig('maintenance_mode', { enabled: true });
      expect(supabase.rpc).toHaveBeenCalledWith('admin_update_system_config', {
        p_key: 'maintenance_mode',
        p_value: { enabled: true },
      });
    });
  });

  describe('resolveSecurityAlert', () => {
    it('calls admin_resolve_security_alert RPC with alertId and notes', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as any);

      const result = await adminService.resolveSecurityAlert(42, 'تم فحص الباك إند');
      expect(supabase.rpc).toHaveBeenCalledWith('admin_resolve_security_alert', {
        p_alert_id: 42,
        p_notes: 'تم فحص الباك إند',
      });
      expect(result).toBe(true);
    });
  });

  describe('assignCompanyPlan', () => {
    it('calls admin_assign_company_plan RPC with companyId and planId', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: true,
        error: null,
      } as any);

      const result = await adminService.assignCompanyPlan('comp-1', 'plan-xyz');
      expect(supabase.rpc).toHaveBeenCalledWith('admin_assign_company_plan', {
        p_company_id: 'comp-1',
        p_plan_id: 'plan-xyz',
      });
      expect(result).toBe(true);
    });
  });

  describe('getSecurityAlerts / getSecurityAlertsCount', () => {
    it('calls the paginated get_security_alerts_page RPC with defaults', async () => {
      const mockRows = [
        {
          id: 1,
          alert_type: 'honeypot_access',
          severity: 'critical',
          source_ip: '192.168.1.100',
          detected_at: '2026-09-03T10:00:00Z',
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockRows,
        error: null,
      } as any);

      const logs = await adminService.getSecurityAlerts();
      expect(supabase.rpc).toHaveBeenCalledWith('get_security_alerts_page', {
        p_limit: 50,
        p_offset: 0,
        p_resolved: null,
      });
      expect(logs).toHaveLength(1);
      expect(logs[0].alert_type).toBe('honeypot_access');
    });

    it('passes pagination and resolved filter to get_security_alerts_page', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [], error: null } as any);

      await adminService.getSecurityAlerts({ limit: 25, offset: 25, resolved: false });
      expect(supabase.rpc).toHaveBeenCalledWith('get_security_alerts_page', {
        p_limit: 25,
        p_offset: 25,
        p_resolved: false,
      });
    });

    it('calls get_security_alerts_count with the resolved filter', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: 7, error: null } as any);

      const count = await adminService.getSecurityAlertsCount(false);
      expect(supabase.rpc).toHaveBeenCalledWith('get_security_alerts_count', { p_resolved: false });
      expect(count).toBe(7);
    });
  });

  describe('getCspReportsPage / getCspReportsCount', () => {
    it('calls the paginated get_csp_reports_page RPC', async () => {
      const mockRows = [
        {
          id: 1,
          document_uri: 'https://erp.alzhra.com/dashboard',
          blocked_uri: 'http://malicious.com/evil.js',
          violated_directive: 'script-src',
          received_at: '2026-09-03T11:00:00Z',
        },
      ];

      vi.mocked(supabase.rpc).mockResolvedValueOnce({
        data: mockRows,
        error: null,
      } as any);

      const reports = await adminService.getCspReportsPage();
      expect(supabase.rpc).toHaveBeenCalledWith('get_csp_reports_page', {
        p_limit: 50,
        p_offset: 0,
      });
      expect(reports).toHaveLength(1);
      expect(reports[0].violated_directive).toBe('script-src');
    });

    it('calls get_csp_reports_count', async () => {
      vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: 3, error: null } as any);

      const count = await adminService.getCspReportsCount();
      expect(supabase.rpc).toHaveBeenCalledWith('get_csp_reports_count');
      expect(count).toBe(3);
    });
  });
});

describe('Full CSV export helpers (exportAll*)', () => {
  const companyRow = {
    id: 'comp-1',
    name_ar: 'شركة النور',
    name_en: null,
    tax_number: '1234567890',
    base_currency: 'SAR',
    owner_id: null,
    owner_email: null,
    phone: null,
    is_active: true,
    subscription_status: 'active',
    trial_ends_at: null,
    plan_id: null,
    plan_name: null,
    user_count: 2,
    branch_count: 1,
    invoice_count: 5,
    created_at: '2026-08-01T00:00:00Z',
  };

  const userRow = {
    user_id: 'user-1',
    email: 'user@example.com',
    created_at: '2026-08-01T00:00:00Z',
    is_super_admin: false,
    companies_count: 1,
    company_names: ['شركة النور'],
  };

  const alertRow = {
    id: 1,
    detected_at: '2026-09-03T10:00:00Z',
    alert_type: 'honeypot_access',
    severity: 'high',
    user_id: null,
    company_id: null,
    source_ip: '1.2.3.4',
    user_agent: null,
    details: {},
    resolved_at: null,
    resolved_by: null,
    resolution_notes: null,
  };

  const cspRow = {
    id: 1,
    received_at: '2026-09-03T11:00:00Z',
    document_uri: 'https://erp.alzhra.com/',
    blocked_uri: 'http://evil.test/x.js',
    violated_directive: 'script-src',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exportAllCompanies pages through until a short page is returned', async () => {
    const chunk = adminService.EXPORT_LIST_CHUNK;
    const fullPage = Array.from({ length: chunk }, (_, i) => ({ ...companyRow, id: `c-${i}` }));
    const tail = [{ ...companyRow, id: 'last' }];

    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: fullPage, error: null } as any)
      .mockResolvedValueOnce({ data: tail, error: null } as any);

    const companies = await adminService.exportAllCompanies({
      search: '  نور  ',
      status: 'active',
    });

    expect(companies).toHaveLength(chunk + 1);
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, 'get_admin_companies_list', {
      p_search: 'نور',
      p_status: 'active',
      p_limit: chunk,
      p_offset: 0,
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'get_admin_companies_list', {
      p_search: 'نور',
      p_status: 'active',
      p_limit: chunk,
      p_offset: chunk,
    });
  });

  it('exportAllUsers maps rows and stops after the first short page', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [userRow], error: null } as any);

    const users = await adminService.exportAllUsers('noor');
    expect(users).toHaveLength(1);
    expect(users[0].company_names).toEqual(['شركة النور']);
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it('exportAllSecurityAlerts pages with the server chunk cap (200)', async () => {
    const chunk = adminService.EXPORT_SECURITY_CHUNK;
    const fullPage = Array.from({ length: chunk }, (_, i) => ({ ...alertRow, id: i + 1 }));
    const tail = [{ ...alertRow, id: chunk + 1 }];

    vi.mocked(supabase.rpc)
      .mockResolvedValueOnce({ data: fullPage, error: null } as any)
      .mockResolvedValueOnce({ data: tail, error: null } as any);

    const alerts = await adminService.exportAllSecurityAlerts(false);
    expect(alerts).toHaveLength(chunk + 1);
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, 'get_security_alerts_page', {
      p_limit: chunk,
      p_offset: chunk,
      p_resolved: false,
    });
  });

  it('exportAllCspReports maps rows from a single short page', async () => {
    vi.mocked(supabase.rpc).mockResolvedValueOnce({ data: [cspRow], error: null } as any);

    const reports = await adminService.exportAllCspReports();
    expect(reports).toHaveLength(1);
    expect(reports[0].violated_directive).toBe('script-src');
  });
});
