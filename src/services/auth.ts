import api from './api';
import type { AuthUser } from '../types';

export type LoginResponse =
  | { status: 'OK'; token: string; user: AuthUser }
  | { status: 'REQUIRES_MFA'; mfaToken: string; email: string }
  | { status: 'CHANGE_PASSWORD'; tempToken: string };

export type SessionResponse =
  | { status: 'OK'; token: string; user: AuthUser }
  | { status: 'REQUIRES_MFA'; mfaToken: string; email: string };

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export async function verifyMfa(mfaToken: string, code: string) {
  const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/mfa/verify', {
    mfaToken,
    code,
  });
  return data;
}

export async function fetchMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await api.post('/auth/password/change', { currentPassword, newPassword });
  return data;
}

export async function changePasswordRequired(
  tempToken: string,
  currentPassword: string,
  newPassword: string
) {
  const { data } = await api.post<SessionResponse>('/auth/password/change-required', {
    tempToken,
    currentPassword,
    newPassword,
  });
  return data;
}

export async function forgotPassword(email: string) {
  const { data } = await api.post<{ ok: boolean }>('/auth/password/forgot', { email });
  return data;
}

export async function verifyResetCode(email: string, code: string) {
  const { data } = await api.post<{ resetToken: string }>('/auth/password/verify-reset-code', {
    email,
    code,
  });
  return data;
}

export async function resetPassword(resetToken: string, newPassword: string) {
  const { data } = await api.post<{ ok: boolean }>('/auth/password/reset', {
    resetToken,
    newPassword,
  });
  return data;
}
