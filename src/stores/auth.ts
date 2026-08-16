import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import * as authApi from '../services/auth';
import type { AuthUser, Permission } from '../types';
import { teardownNotificationStream } from '../composables/useNotifications';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('centaur_token'));
  const mfaToken = ref<string | null>(localStorage.getItem('centaur_mfa_token'));
  const tempToken = ref<string | null>(localStorage.getItem('centaur_temp_token'));
  const user = ref<AuthUser | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => Boolean(token.value));
  const fullName = computed(() => {
    if (!user.value) return '';
    const fn = user.value.firstName || user.value.first_name || '';
    const ln = user.value.lastName || user.value.last_name || '';
    return `${fn} ${ln}`.trim();
  });

  function hasPermission(perm: Permission): boolean {
    return Boolean(user.value?.permissions?.includes(perm));
  }

  function setSession(newToken: string, authUser: AuthUser) {
    token.value = newToken;
    user.value = {
      ...authUser,
      firstName: authUser.firstName || authUser.first_name || '',
      lastName: authUser.lastName || authUser.last_name || '',
      id: authUser.id || authUser.sub,
    };
    localStorage.setItem('centaur_token', newToken);
    localStorage.removeItem('centaur_mfa_token');
    localStorage.removeItem('centaur_temp_token');
    mfaToken.value = null;
    tempToken.value = null;
  }

  async function login(email: string, password: string) {
    loading.value = true;
    error.value = null;
    try {
      const result = await authApi.login(email, password);
      if (result.status === 'OK') {
        setSession(result.token, result.user);
        return { status: 'OK' as const };
      }
      if (result.status === 'REQUIRES_MFA') {
        mfaToken.value = result.mfaToken;
        localStorage.setItem('centaur_mfa_token', result.mfaToken);
        return { status: 'REQUIRES_MFA' as const, email: result.email };
      }
      tempToken.value = result.tempToken;
      localStorage.setItem('centaur_temp_token', result.tempToken);
      return { status: 'CHANGE_PASSWORD' as const, tempToken: result.tempToken };
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Échec de connexion';
      error.value = msg;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function verifyMfa(code: string) {
    loading.value = true;
    error.value = null;
    try {
      const mt = mfaToken.value || localStorage.getItem('centaur_mfa_token');
      if (!mt) throw new Error('Session MFA manquante');
      const result = await authApi.verifyMfa(mt, code);
      setSession(result.token, result.user);
      return result;
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Vérification MFA échouée';
      error.value = msg;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function completeForcedPasswordChange(currentPassword: string, newPassword: string) {
    loading.value = true;
    error.value = null;
    try {
      const tt = tempToken.value || localStorage.getItem('centaur_temp_token');
      if (!tt) throw new Error('Session de changement de mot de passe manquante');
      const result = await authApi.changePasswordRequired(tt, currentPassword, newPassword);
      if (result.status === 'OK') {
        setSession(result.token, result.user);
        return { status: 'OK' as const };
      }
      mfaToken.value = result.mfaToken;
      localStorage.setItem('centaur_mfa_token', result.mfaToken);
      localStorage.removeItem('centaur_temp_token');
      tempToken.value = null;
      return { status: 'REQUIRES_MFA' as const, email: result.email };
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Changement de mot de passe impossible';
      error.value = msg;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function requestPasswordReset(email: string) {
    loading.value = true;
    error.value = null;
    try {
      await authApi.forgotPassword(email);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Demande impossible';
      error.value = msg;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function verifyResetCode(email: string, code: string) {
    loading.value = true;
    error.value = null;
    try {
      const result = await authApi.verifyResetCode(email, code);
      return result.resetToken;
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Code invalide';
      error.value = msg;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function resetPassword(resetTokenValue: string, newPassword: string) {
    loading.value = true;
    error.value = null;
    try {
      await authApi.resetPassword(resetTokenValue, newPassword);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Réinitialisation impossible';
      error.value = msg;
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function loadMe() {
    if (!token.value) return null;
    const me = await authApi.fetchMe();
    user.value = {
      id: me.id,
      email: me.email,
      role: me.role,
      permissions: me.permissions || [],
      firstName: me.first_name,
      lastName: me.last_name,
    };
    return user.value;
  }

  function logout() {
    teardownNotificationStream();
    token.value = null;
    mfaToken.value = null;
    tempToken.value = null;
    user.value = null;
    localStorage.removeItem('centaur_token');
    localStorage.removeItem('centaur_mfa_token');
    localStorage.removeItem('centaur_temp_token');
  }

  return {
    token,
    mfaToken,
    tempToken,
    user,
    loading,
    error,
    isAuthenticated,
    fullName,
    hasPermission,
    login,
    verifyMfa,
    completeForcedPasswordChange,
    requestPasswordReset,
    verifyResetCode,
    resetPassword,
    loadMe,
    logout,
    setSession,
  };
});
