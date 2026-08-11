import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../../src/stores/auth';
import * as authApi from '../../src/services/auth';

jest.mock('../../src/services/auth');

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    jest.resetAllMocks();
  });

  it('login OK stores token and user', async () => {
    (authApi.login as jest.Mock).mockResolvedValue({
      status: 'OK',
      token: 'jwt-token',
      user: {
        email: 'rachasl720@gmail.com',
        role: 'MEDECIN',
        permissions: ['patients:read'],
        firstName: 'Racha',
        lastName: 'M',
      },
    });
    const store = useAuthStore();
    const result = await store.login('rachasl720@gmail.com', 'Admin123!');
    expect(result.status).toBe('OK');
    expect(store.token).toBe('jwt-token');
    expect(store.isAuthenticated).toBe(true);
    expect(localStorage.getItem('centaur_token')).toBe('jwt-token');
  });

  it('login REQUIRES_MFA stores mfa token', async () => {
    (authApi.login as jest.Mock).mockResolvedValue({
      status: 'REQUIRES_MFA',
      mfaToken: 'mfa-tok',
      email: 'sedjalkhouloud@gmail.com',
    });
    const store = useAuthStore();
    const result = await store.login('sedjalkhouloud@gmail.com', 'Admin123!');
    expect(result.status).toBe('REQUIRES_MFA');
    expect(store.mfaToken).toBe('mfa-tok');
  });

  it('verifyMfa completes session', async () => {
    localStorage.setItem('centaur_mfa_token', 'mfa');
    (authApi.verifyMfa as jest.Mock).mockResolvedValue({
      token: 'final-jwt',
      user: {
        email: 'sedjalkhouloud@gmail.com',
        role: 'ADMIN',
        permissions: ['patients:delete'],
        firstName: 'K',
        lastName: 'S',
      },
    });
    const store = useAuthStore();
    store.mfaToken = 'mfa';
    await store.verifyMfa('123456');
    expect(store.token).toBe('final-jwt');
    expect(store.hasPermission('patients:delete')).toBe(true);
  });

  it('logout clears storage', () => {
    const store = useAuthStore();
    store.setSession('t', {
      email: 'a@b.c',
      role: 'ADMIN',
      permissions: [],
      firstName: 'A',
      lastName: 'B',
    });
    store.logout();
    expect(store.token).toBeNull();
    expect(localStorage.getItem('centaur_token')).toBeNull();
  });

  it('loadMe maps backend fields', async () => {
    localStorage.setItem('centaur_token', 't');
    const store = useAuthStore();
    store.token = 't';
    (authApi.fetchMe as jest.Mock).mockResolvedValue({
      id: '1',
      email: 'x@y.com',
      role: 'SECRETAIRE',
      permissions: ['patients:read'],
      first_name: 'Sec',
      last_name: 'Ret',
    });
    await store.loadMe();
    expect(store.user?.firstName).toBe('Sec');
    expect(store.fullName).toContain('Sec');
  });
});
