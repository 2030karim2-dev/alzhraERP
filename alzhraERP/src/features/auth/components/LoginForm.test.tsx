import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginForm } from './LoginForm';
import { STORAGE_KEYS } from '../../../core/constants';

const mockLogin = vi.fn();

vi.mock('../hooks', () => ({
  useLogin: () => ({ login: mockLogin, isLoading: false, error: null }),
  useGoogleLogin: () => ({ login: vi.fn(), isLoading: false, error: null }),
}));

describe('LoginForm - Remember Me', () => {
  beforeEach(() => {
    localStorage.clear();
    mockLogin.mockClear();
  });

  it('renders Remember Me checkbox and Forgot Password link', () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    );

    const checkbox = screen.getByRole('checkbox', { name: /تذكرني|remember me/i });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();

    const forgotLink = screen.getByRole('link', { name: /نسيت كلمة المرور/i });
    expect(forgotLink).toBeInTheDocument();
  });

  it('loads remembered email and sets checkbox to checked if saved in localStorage', () => {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    localStorage.setItem(STORAGE_KEYS.REMEMBERED_EMAIL, 'remembered@alzhra.com');

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/البريد الإلكتروني|email/i);
    expect(emailInput).toHaveValue('remembered@alzhra.com');

    const checkbox = screen.getByRole('checkbox', { name: /تذكرني|remember me/i });
    expect(checkbox).toBeChecked();
  });

  it('saves email to localStorage on submit when Remember Me is checked', () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/البريد الإلكتروني|email/i);
    const passwordInput = screen.getByLabelText(/كلمة المرور|password/i);
    const checkbox = screen.getByRole('checkbox', { name: /تذكرني|remember me/i });

    fireEvent.change(emailInput, { target: { value: 'user@alzhra.com' } });
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();

    const submitBtn = screen.getByRole('button', { name: 'دخول النظام' });
    const form = submitBtn.closest('form');
    expect(form).not.toBeNull();
    if (form) {
      fireEvent.submit(form);
    }

    expect(mockLogin).toHaveBeenCalledWith('user@alzhra.com', 'secret123');
    expect(localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)).toBe('true');
    expect(localStorage.getItem(STORAGE_KEYS.REMEMBERED_EMAIL)).toBe('user@alzhra.com');
  });

  it('removes remembered credentials from localStorage when unchecked', () => {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_ME, 'true');
    localStorage.setItem(STORAGE_KEYS.REMEMBERED_EMAIL, 'old@alzhra.com');

    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    );

    const checkbox = screen.getByRole('checkbox', { name: /تذكرني|remember me/i });
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(checkbox).not.toBeChecked();

    expect(localStorage.getItem(STORAGE_KEYS.REMEMBER_ME)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.REMEMBERED_EMAIL)).toBeNull();
  });
});
