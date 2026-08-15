/**
 * Couche legacy — réexporte l’API auth (Phase 3).
 */
export {
  login,
  verifyMfa,
  fetchMe,
  changePassword,
  changePasswordRequired,
  forgotPassword,
  verifyResetCode,
  resetPassword,
} from '../api/auth.api';
export type { LoginResponse, SessionResponse } from '../api/auth.api';
