import axios, { type AxiosInstance } from 'axios';

const baseURL = process.env.VUE_APP_API_URL || '/api';

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, options?: { code?: string; details?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options?.code;
    this.details = options?.details;
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Données invalides.',
  401: 'Session expirée. Veuillez vous reconnecter.',
  403: "Vous n'avez pas les permissions nécessaires.",
  404: 'Ressource introuvable.',
  409: 'Conflit avec l’état actuel de la ressource.',
  422: 'Les données fournies sont incorrectes.',
  429: 'Trop de requêtes. Réessayez plus tard.',
  500: 'Une erreur serveur est survenue.',
  502: 'Une erreur serveur est survenue.',
  503: 'Service temporairement indisponible.',
};

function isPublicAuthRoute(hash: string): boolean {
  return (
    hash.includes('/login') ||
    hash.includes('/mfa') ||
    hash.includes('/change-password') ||
    hash.includes('/forgot-password') ||
    hash.includes('/reset-password')
  );
}

function clearSessionTokens(): void {
  localStorage.removeItem('centaur_token');
  localStorage.removeItem('centaur_mfa_token');
  localStorage.removeItem('centaur_temp_token');
}

let unauthorizedHandler: (() => void) | null = null;

/** Pinia registers this so a 401 also tears down SSE and clears the auth store. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

/** Transforme une erreur Axios (ou autre) en ApiError exploitable par l’UI. */
export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const like = error as {
    code?: string;
    message?: string;
    response?: { status?: number; data?: { error?: string; message?: string; code?: string } };
  };

  const isAxiosLike =
    axios.isAxiosError(error) ||
    (like != null && typeof like === 'object' && typeof like.response?.status === 'number');

  if (isAxiosLike) {
    if (like.code === 'ECONNABORTED') {
      return new ApiError('Délai d’attente dépassé. Réessayez.', 0, { code: 'TIMEOUT' });
    }

    if (!like.response) {
      return new ApiError('Impossible de contacter le serveur.', 0, { code: 'NETWORK' });
    }

    const status = Number(like.response.status) || 0;
    const data = like.response.data;
    const serverMsg =
      (typeof data === 'object' && data && (data.error || data.message)) || undefined;
    const fallback = STATUS_MESSAGES[status] || 'Une erreur est survenue.';
    const message =
      status === 400 || status === 422
        ? String(serverMsg || fallback)
        : STATUS_MESSAGES[status]
          ? STATUS_MESSAGES[status]
          : String(serverMsg || fallback);

    return new ApiError(message, status, {
      code: typeof data === 'object' && data ? data.code : undefined,
      details: data,
    });
  }

  if (error instanceof Error) {
    return new ApiError(error.message || 'Une erreur est survenue.', 0);
  }

  return new ApiError('Une erreur est survenue.', 0);
}

export const api: AxiosInstance = axios.create({
  baseURL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('centaur_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const reqUrl = String(error.config?.url || '');
    if (status === 401 && reqUrl.includes('/auth/logout')) {
      return Promise.reject(error);
    }
    if (status === 401) {
      const hash = window.location.hash || '';
      if (!isPublicAuthRoute(hash)) {
        if (unauthorizedHandler) unauthorizedHandler();
        else clearSessionTokens();
        if (!hash.includes('/login')) {
          window.location.hash = '#/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
