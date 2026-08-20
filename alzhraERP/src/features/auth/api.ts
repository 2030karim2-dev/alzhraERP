import { supabase } from '../../lib/supabaseClient';
import { logger } from '../../core/utils/logger';

// Types for the user profile resolution chain
interface AuthProfileData {
    id: string;
    email?: string;
    full_name?: string;
    avatar_url?: string | null;
    role?: string;
    company_id?: string | null;
    company_name?: string | null;
    branch_id?: string | null;
    branch_name?: string | null;
}

interface GetUserProfilePayload {
    id: string;
    full_name?: string;
    avatar_url?: string | null;
    companies?: Array<{
        role?: string;
        company_id?: string | null;
        company_name?: string | null;
        branch_id?: string | null;
        branch_name?: string | null;
    }>;
}

type ProfileRpcError = Error & { code?: string; details?: unknown };

interface ProfileRpcResult {
    data: GetUserProfilePayload | null;
    error: ProfileRpcError | null;
}

interface ProfileResult {
    data: AuthProfileData | null;
    error: unknown;
    isAborted?: boolean;
}

// Registry to deduplicate in-flight profile requests
const profileRequests = new Map<string, Promise<ProfileResult>>();

export const authApi = {
  signInWithPassword: async (email: string, pass: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
  },

  signInWithGoogle: async (redirectTo?: string) => {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
  },

  // --- MFA Methods ---
  enrollMFA: async () => {
    return await supabase.auth.mfa.enroll({
      factorType: 'totp'
    });
  },

  challengeMFA: async (factorId: string) => {
    return await supabase.auth.mfa.challenge({ factorId });
  },

  verifyMFA: async (factorId: string, challengeId: string, code: string) => {
    return await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code
    });
  },
  // -------------------

  signUp: async (email: string, pass: string, companyName: string, fullName: string) => {
    // Ensure values are strings and trimmed
    const cleanFullName = String(fullName || '').trim();
    const cleanCompanyName = String(companyName || '').trim();

    return await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: {
          full_name: cleanFullName,
          company_name: cleanCompanyName,
        }
      }
    });
  },

  getProfile: async (userId: string): Promise<ProfileResult> => {
    // 1. Check if a request for this user is already in progress
    if (profileRequests.has(userId)) {
      return profileRequests.get(userId)!;
    }

    const fetchPromise = (async (): Promise<ProfileResult> => {
      try {
        // 1. Try RPC first
        // ⚡ MUST be invoked as supabase.rpc(...) — extracting the method into a
        // standalone variable drops `this`, and supabase-js's rpc() reads
        // this.rest internally, throwing
        // "Cannot read properties of undefined (reading 'rest')".
        const rpcResult = (await supabase.rpc('get_user_profile', {
          p_user_id: userId,
        })) as unknown as ProfileRpcResult;
        const { data, error } = rpcResult;

        if (!error && data && Object.keys(data).length > 2) {
          // Fetch email from session as RPC does not return it
          const { data: authData } = await supabase.auth.getUser();
          const user = authData?.user ?? null;

          const firstCompany = Array.isArray(data.companies) && data.companies.length > 0 ? data.companies[0] : null;

          const flatData = {
            id: data.id,
            email: user?.email || '',
            full_name: data.full_name || user?.user_metadata?.full_name || '',
            avatar_url: data.avatar_url || user?.user_metadata?.avatar_url,
            role: firstCompany?.role || 'viewer',
            company_id: firstCompany?.company_id ?? null,
            company_name: firstCompany?.company_name ?? null,
            branch_id: firstCompany?.branch_id ?? null,
            branch_name: firstCompany?.branch_name ?? null,
          };

          return { data: flatData, error: null };
        }

        // 2. Fallback: Manual fetch if RPC fails (e.g. timeout or connection closed)
        if (error) {
          // ⚡ Skip warning for abortions as they are expected during concurrency
          const isAbort = error.name === 'AbortError' || error.message?.includes('aborted') || error.message === 'signal is aborted without reason';

          if (isAbort) {
            return { data: null, error: null, isAborted: true };
          }

          logger.warn('Auth', `RPC get_user_profile failed (${error.code}: ${error.message}), failing back to manual`, {
            code: error.code,
            message: error.message,
            details: error.details
          });
        } else {
          logger.warn('Auth', 'RPC get_user_profile returned incomplete data, attempting manual fallback');
        }

        const [profileRes, roleRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          // .limit(1).maybeSingle() — NOT .single(): a user with multiple
          // company memberships would otherwise fail with PGRST116 and the
          // whole fallback would break (login stuck).
          supabase.from('user_company_roles').select('role, company_id, branch_id, companies(name_ar), branches(name)').eq('user_id', userId).limit(1).maybeSingle()
        ]);

        if (profileRes.error) {
          return { data: null, error: profileRes.error };
        }

        const profileData = profileRes.data;

        // Get email from session user if missing
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user ?? null;

        const fallbackData = {
          id: userId,
          email: user?.email || '',
          full_name: profileData?.full_name || user?.user_metadata?.full_name || '',
          avatar_url: profileData?.avatar_url || user?.user_metadata?.avatar_url,
          role: roleRes.data?.role || 'viewer',
          company_id: roleRes.data?.company_id ?? null,
          company_name: roleRes.data?.companies?.name_ar ?? null,
          branch_id: roleRes.data?.branch_id ?? null,
          branch_name: roleRes.data?.branches?.name ?? null,
        };

        return { data: fallbackData, error: null };
      } catch (err: unknown) {
        // ⚡ Handle AbortError gracefully (common in concurrent auth checks)
        const error = err as Error;
        if (error?.name === 'AbortError' || error?.message?.includes('aborted') || error?.message === 'signal is aborted without reason') {
          return { data: null, error: null, isAborted: true }; // Flag as aborted
        }

        logger.error('Auth', 'Profile fetch exception', error);
        return { data: null, error: err };
      } finally {
        // 3. Clear request from registry once finished/failed
        profileRequests.delete(userId);
      }
    })();

    // Store promise in registry
    profileRequests.set(userId, fetchPromise);
    return fetchPromise;
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },

  resetPasswordForEmail: async (email: string) => {
    return await supabase.auth.resetPasswordForEmail(email);
  },

  updateUserPassword: async (password: string) => {
    return await supabase.auth.updateUser({ password });
  },

  updateProfile: async (fullName: string) => {
    const { data, error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (error) throw error;
    return data;
  },

  // Note: inviteUser moved to settingsApi.inviteUser (includes created_by field)
};
