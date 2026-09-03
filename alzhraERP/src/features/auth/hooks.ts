import { useAuthStore } from './store';
import { authApi } from './api';
import type { AuthUser } from './types';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabaseClient';
import { ROUTES } from '../../core/routes/paths';
import { parseError } from '../../core/utils/errorUtils';
import { logger } from '../../core/utils/logger';

// SECURITY (R-02): registration input validation. The same rules
// are duplicated server-side via a Supabase Auth Hook (project-
// level configuration). They exist here for UX (immediate feedback)
// and as a first line of defense against direct API callers who
// disable JS. Throws on the first failure.
function validateRegistrationInputs(
  email: string,
  pass: string,
  companyName: string,
  fullName: string
): void {
  if (!email || !pass || !companyName || !fullName) {
    throw new Error('جميع الحقول مطلوبة');
  }
  if (email.length > 254) {
    throw new Error('البريد الإلكتروني طويل جداً');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('صيغة البريد الإلكتروني غير صحيحة');
  }
  if (companyName.length > 200) {
    throw new Error('اسم الشركة طويل جداً (الحد الأقصى 200 حرف)');
  }
  if (fullName.length > 200) {
    throw new Error('الاسم الكامل طويل جداً (الحد الأقصى 200 حرف)');
  }
  if (pass.length < 8) {
    throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  }
  if (pass.length > 128) {
    // bcrypt truncates at 72 bytes; reject anything over 128 to
    // avoid silent truncation and to discourage abuse.
    throw new Error('كلمة المرور طويلة جداً (الحد الأقصى 128 حرف)');
  }
  if (!/[A-Z]/.test(pass)) {
    throw new Error('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل');
  }
  if (!/[a-z]/.test(pass)) {
    throw new Error('كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل');
  }
  if (!/[0-9]/.test(pass)) {
    throw new Error('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
  }
  if (/^(.)\1+$/.test(pass)) {
    throw new Error('كلمة المرور لا يمكن أن تتكون من حرف واحد مكرر');
  }
  if (/^(password|12345678|qwerty|admin|test)/i.test(pass)) {
    throw new Error('كلمة المرور شائعة جداً، يرجى اختيار كلمة مرور أقوى');
  }
}

export const useAuth = () => {
  const { user, isAuthenticated, isLoading, isReady, initialize, logout } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    isReady,
    initialize,
    logout,
  };
};

export const useLogout = () => {
  const { logout } = useAuthStore();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate(ROUTES.AUTH.LOGIN);
    } catch (error) {
      logger.error('Auth', 'Logout error', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return { logout: handleLogout, isLoggingOut };
};

export const useLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login: setStoreUser } = useAuthStore();
  const navigate = useNavigate();

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: loginError } = await authApi.signInWithPassword(email, pass);

      if (loginError) throw loginError;

      if (data.user) {
        const { data: profile, isAborted } = await authApi.getProfile(data.user.id);

        if (isAborted) {
          // Profile fetch was cancelled/timed out (rare, concurrent
          // auth checks). Surface a clear message instead of silently
          // returning to a frozen login screen with no feedback.
          setError('تعذر تحميل ملف التعريف. حاول مرة أخرى.');
          return;
        }

        if (profile) {
          setStoreUser(profile as AuthUser);
          navigate(ROUTES.DASHBOARD.ROOT, { replace: true });
        } else {
          throw new Error('حسابك موجود ولكن ملف التعريف غير مكتمل. يرجى التواصل مع الدعم.');
        }
      }
    } catch (err: unknown) {
      const parsed = parseError(err);
      setError(parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
};

export const useRegister = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const register = async (email: string, pass: string, companyName: string, fullName: string) => {
    setIsLoading(true);
    setError(null);

    try {
      validateRegistrationInputs(email, pass, companyName, fullName);

      // 2. Call Supabase API
      const { data, error } = await authApi.signUp(email, pass, companyName, fullName);

      if (error) {
        throw error;
      }

      if (data.user) {
        // Check if session exists (Auto login vs Email Confirmation)
        if (data.session) {
          navigate(ROUTES.DASHBOARD.ROOT, { replace: true });
        } else {
          setIsSuccess(true);
        }
      }
    } catch (err: unknown) {
      const parsed = parseError(err);
      setError(parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { register, isLoading, error, isSuccess };
};

export const usePasswordReset = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const requestReset = async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await authApi.resetPasswordForEmail(email);
      if (error) throw error;
      setSuccess(true);
    } catch (err: unknown) {
      const parsed = parseError(err);
      setError(parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  const confirmUpdate = async (newPassword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await authApi.updateUserPassword(newPassword);
      if (error) throw error;
      navigate(ROUTES.AUTH.LOGIN);
    } catch (err: unknown) {
      const parsed = parseError(err);
      setError(parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  return { requestReset, confirmUpdate, isLoading, error, success };
};

export const usePasswordChange = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changePassword = async (newPassword: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await authApi.updateUserPassword(newPassword);
      if (error) throw error;
      return true;
    } catch (err: unknown) {
      const parsed = parseError(err);
      setError(parsed.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { changePassword, isLoading, error };
};

/**
 * Signs the user out of all other devices/browsers while keeping the current
 * session alive. Backed by `authApi.terminateOtherSessions()` — the component
 * layer stays free of any direct supabase calls (Layer rule).
 */
export const useTerminateSessions = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const terminateOthers = async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      await authApi.terminateOtherSessions();
      return true;
    } catch (err: unknown) {
      const parsed = parseError(err);
      setError(parsed.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { terminateOthers, isLoading, error };
};

export const useGoogleLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loginWithGoogle } = useAuthStore();

  const login = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
      // Redirect is handled by the browser
    } catch (err: unknown) {
      const parsed = parseError(err);
      setError(parsed.message);
      setIsLoading(false);
    }
  };

  return { login, isLoading, error };
};

/**
 * useIsSuperAdmin — Server-authoritative check for Super Admin privileges
 * Cached for 5 minutes via React Query.
 */
export const useIsSuperAdmin = () => {
  const { user, isAuthenticated } = useAuthStore();

  return useQuery({
    queryKey: ['is_super_admin', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!isAuthenticated || !user?.id) return false;
      try {
        const { data, error } = await supabase.rpc('is_super_admin');
        if (error) {
          logger.warn('Auth', 'is_super_admin check error', error);
          return false;
        }
        return !!data;
      } catch (err) {
        logger.error('Auth', 'Failed to evaluate is_super_admin', err);
        return false;
      }
    },
    enabled: !!isAuthenticated && !!user?.id,
    // فترة قصيرة حتى تنعكس أي تغييرات على صلاحية السوبر أدمن (ترقية/سحب)
    // بأسرع وقت دون ترك نافذة وصول قديمة لمستخدم سُحبت صلاحيته.
    staleTime: 30_000,
    gcTime: 2 * 60 * 1000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
};
