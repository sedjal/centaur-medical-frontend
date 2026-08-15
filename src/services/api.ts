/**
 * Couche legacy — réexporte le client central (Phase 3).
 * Les nouveaux modules doivent importer depuis `src/api/client`.
 */
export { api, default, parseApiError, ApiError } from '../api/client';
