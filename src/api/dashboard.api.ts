import api from './client';
import type { DashboardStats } from '../types';

export async function getDashboardStats() {
  const { data } = await api.get<DashboardStats>('/dashboard/stats');
  return data;
}
