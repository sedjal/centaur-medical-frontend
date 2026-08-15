import api from './client';
import type { AuditLog } from '../types';

export async function getAuditLogs() {
  const { data } = await api.get<AuditLog[]>('/audit-logs');
  return data;
}
