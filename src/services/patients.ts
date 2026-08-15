/**
 * Couche legacy — réexporte patients / dashboard / audit (Phase 3).
 */
export {
  getPatients as listPatients,
  getPatient,
  createPatient,
  updatePatient,
  deletePatient,
} from '../api/patients.api';
export { getDashboardStats } from '../api/dashboard.api';
export { getAuditLogs } from '../api/audit.api';
