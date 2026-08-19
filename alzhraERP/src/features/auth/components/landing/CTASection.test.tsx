import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// تجنّب تنفيذ hooks المصادقة الحقيقية (تستخدم supabase و react-router)
vi.mock('@/features/auth/hooks', () => ({
  useLogin: () => ({ login: vi.fn(), isLoading: false, error: null }),
  useGoogleLogin: () => ({ login: vi.fn(), isLoading: false, error: null }),
  useRegister: () => ({ register: vi.fn(), isLoading: false, error: null, isSuccess: false }),
}));

import CTASection from './CTASection';

describe('CTASection', () => {
  it('يستدعي onTabChange مع "register" عند النقر على تبويب التسجيل', () => {
    const onTabChange = vi.fn();
    const ref = React.createRef<HTMLDivElement>();
    render(<CTASection sectionRef={ref} authTab="login" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'تسجيل' }));
    expect(onTabChange).toHaveBeenCalledWith('register');
  });

  it('يستدعي onTabChange مع "login" عند النقر على تبويب الدخول', () => {
    const onTabChange = vi.fn();
    const ref = React.createRef<HTMLDivElement>();
    render(<CTASection sectionRef={ref} authTab="register" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'دخول' }));
    expect(onTabChange).toHaveBeenCalledWith('login');
  });
});
