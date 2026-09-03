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

  describe('getHoneypotLogs', () => {
    it('queries the actual security_alerts table ordered by detected_at DESC', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce({
          data: [
            {
              id: 1,
              alert_type: 'honeypot_access',
              severity: 'critical',
              source_ip: '192.168.1.100',
              detected_at: '2026-09-03T10:00:00Z',
            },
          ],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValueOnce(mockChain as any);

      const logs = await adminService.getHoneypotLogs();
      expect(supabase.from).toHaveBeenCalledWith('security_alerts');
      expect(mockChain.order).toHaveBeenCalledWith('detected_at', { ascending: false });
      expect(logs).toHaveLength(1);
      expect(logs[0].alert_type).toBe('honeypot_access');
    });
  });

  describe('getCspReports', () => {
    it('queries csp_reports ordered by received_at DESC', async () => {
      const mockChain = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce({
          data: [
            {
              id: 1,
              document_uri: 'https://erp.alzhra.com/dashboard',
              blocked_uri: 'http://malicious.com/evil.js',
              violated_directive: 'script-src',
              received_at: '2026-09-03T11:00:00Z',
            },
          ],
          error: null,
        }),
      };

      vi.mocked(supabase.from).mockReturnValueOnce(mockChain as any);

      const reports = await adminService.getCspReports();
      expect(supabase.from).toHaveBeenCalledWith('csp_reports');
      expect(mockChain.order).toHaveBeenCalledWith('received_at', { ascending: false });
      expect(reports).toHaveLength(1);
      expect(reports[0].violated_directive).toBe('script-src');
    });
  });
});
