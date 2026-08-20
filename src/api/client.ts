import axios, { type AxiosInstance } from 'axios';

const baseURL = process.env.VUE_APP_API_URL || '/api';

/** Affiché sur la page login après une session expirée (401). */
export const AUTH_NOTICE_KEY = 'centaur_auth_notice';

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

/** Messages HTTP clairs (FR) — jamais le texte technique Axios. */
export const STATUS_MESSAGES: Record<number, string> = {
  400: 'Les données fournies sont invalides.',
  401: 'Session expirée. Veuillez vous reconnecter.',
  403: "Vous n'avez pas les permissions nécessaires.",
  404: 'Ressource introuvable.',
  409: "Conflit : l'opération n'est pas possible dans cet état.",
  413: 'Fichier trop volumineux (maximum 5 Mo).',
  422: 'Les données fournies sont incorrectes.',
  429: 'Trop de requêtes. Réessayez dans quelques instants.',
  500: 'Une erreur serveur est survenue. Réessayez plus tard.',
  502: 'Une erreur serveur est survenue. Réessayez plus tard.',
  503: 'Service temporairement indisponible. Réessayez plus tard.',
};

/** Traduction des messages techniques renvoyés par l’API. */
const SERVER_MESSAGE_MAP: Record<string, string> = {
  'invalid credentials': 'Email ou mot de passe incorrect.',
  unauthorized: 'Session expirée. Veuillez vous reconnecter.',
  forbidden: "Vous n'avez pas les permissions nécessaires.",
  'not found': 'Ressource introuvable.',
  'patient not found': 'Patient introuvable.',
  'internal error': 'Une erreur serveur est survenue. Réessayez plus tard.',
  'internal server error': 'Une erreur serveur est survenue. Réessayez plus tard.',
  'payload too large': 'Fichier trop volumineux (maximum 5 Mo).',
  'file too large': 'Fichier trop volumineux (maximum 5 Mo).',
  'emergency fields required': 'Les champs urgences sont obligatoires.',
  'oncology fields required': 'Les champs oncologie sont obligatoires.',
  'cardiology fields required': 'Les champs cardiologie sont obligatoires.',
  'invalid hospitalization date': "La date d'hospitalisation est invalide.",
  'mfa required': 'Vérification MFA requise.',
  'invalid mfa code': 'Code de vérification incorrect ou expiré.',
  'invalid or expired code': 'Code invalide ou expiré.',
  'reset token invalid': 'Lien ou code de réinitialisation invalide.',
  'password too weak': 'Le mot de passe ne respecte pas les règles de sécurité.',
};

function clearSessionTokens(): void {
  localStorage.removeItem('centaur_token');
  localStorage.removeItem('centaur_mfa_token');
  localStorage.removeItem('centaur_temp_token');
}

function requestUrlOf(error: unknown): string {
  const cfg = (error as { config?: { url?: string; baseURL?: string } })?.config;
  return String(cfg?.url || '');
}

function mapServerMessage(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const mapped = SERVER_MESSAGE_MAP[trimmed.toLowerCase()];
  if (mapped) return mapped;
  // Message déjà en français (contient accents / mots courants) → garder
  if (/[àâäéèêëïîôùûüç]|obligatoire|invalide|impossible|autoris/i.test(trimmed)) {
    return trimmed;
  }
  // Message anglais technique générique → ignorer (fallback status)
  if (/^[A-Za-z0-9 _:'".,/-]+$/.test(trimmed) && /\b(error|failed|invalid|unauthorized|forbidden)\b/i.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

function messageForStatus(status: number, url: string, serverMsg?: string): string {
  const mappedServer = mapServerMessage(serverMsg);
  const path = url.toLowerCase();

  if (status === 401) {
    // Identifiants incorrects (login) — même sans URL (stubs / mocks)
    if (
      path.includes('/auth/login') ||
      (serverMsg && /invalid credentials/i.test(serverMsg))
    ) {
      return mappedServer || 'Email ou mot de passe incorrect.';
    }
    if (path.includes('/auth/mfa') || path.includes('/mfa')) {
      return mappedServer || 'Code de vérification incorrect ou expiré.';
    }
    if (
      path.includes('/auth/forgot') ||
      path.includes('/auth/reset') ||
      path.includes('/password')
    ) {
      return mappedServer || 'Code ou session invalide. Recommencez la procédure.';
    }
    return STATUS_MESSAGES[401];
  }

  if (status === 400 || status === 422) {
    return mappedServer || STATUS_MESSAGES[status] || STATUS_MESSAGES[400];
  }

  if (STATUS_MESSAGES[status]) {
    return STATUS_MESSAGES[status];
  }

  return mappedServer || 'Une erreur est survenue.';
}

let unauthorizedHandler: (() => void) | null = null;

/** Pinia registers this so a 401 also tears down SSE and clears the auth store. */
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  unauthorizedHandler = fn;
}

export function setAuthNotice(message: string): void {
  try {
    sessionStorage.setItem(AUTH_NOTICE_KEY, message);
  } catch {
    /* ignore quota / private mode */
  }
}

export function consumeAuthNotice(): string | null {
  try {
    const msg = sessionStorage.getItem(AUTH_NOTICE_KEY);
    if (msg) sessionStorage.removeItem(AUTH_NOTICE_KEY);
    return msg;
  } catch {
    return null;
  }
}

/** Transforme une erreur Axios (ou autre) en ApiError avec message FR clair. */
export function parseApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  const like = error as {
    code?: string;
    message?: string;
    config?: { url?: string };
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
    const url = requestUrlOf(error);
    const message = messageForStatus(status, url, serverMsg ? String(serverMsg) : undefined);

    return new ApiError(message, status, {
      code: typeof data === 'object' && data ? data.code : undefined,
      details: data,
    });
  }

  if (error instanceof Error) {
    const mapped = mapServerMessage(error.message);
    return new ApiError(mapped || error.message || 'Une erreur est survenue.', 0);
  }

  return new ApiError('Une erreur est survenue.', 0);
}

export function handleUnauthorized(reqUrl = ''): void {
  if (reqUrl.includes('/auth/logout')) return;
  if (reqUrl.includes('/auth/login')) return;
  const hash = window.location.hash || '';
  // Sur MFA / reset : ne pas purger les tokens temporaires
  if (
    hash.includes('/mfa') ||
    hash.includes('/change-password') ||
    hash.includes('/forgot-password') ||
    hash.includes('/reset-password')
  ) {
    return;
  }

  setAuthNotice(STATUS_MESSAGES[401]);

  if (unauthorizedHandler) unauthorizedHandler();
  else clearSessionTokens();

  if (!hash.includes('/login')) {
    window.location.hash = '#/login';
  }
}

/**
 * Empêche l’overlay Webpack (« Uncaught runtime errors ») pour les ApiError déjà gérées.
 * Les vraies erreurs de rendu Vue restent visibles.
 */
export function installApiErrorOverlayGuard(): void {
  if (typeof window === 'undefined') return;
  const w = window as Window & { __centaurApiErrorGuard?: boolean };
  if (w.__centaurApiErrorGuard) return;
  w.__centaurApiErrorGuard = true;

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason instanceof ApiError) {
      event.preventDefault();
      return;
    }
    if (axios.isAxiosError(reason)) {
      event.preventDefault();
    }
  });
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
    const parsed = parseApiError(error);

    if (status === 401 && reqUrl.includes('/auth/logout')) {
      return Promise.reject(parsed);
    }
    if (status === 401) {
      handleUnauthorized(reqUrl);
    }
    return Promise.reject(parsed);
  }
);

export default api;
