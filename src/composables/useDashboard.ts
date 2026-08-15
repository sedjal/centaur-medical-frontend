import { ref } from 'vue';
import { getDashboardStats } from '../api/dashboard.api';
import type { DashboardStats } from '../types';
import { useApiError } from './useApiError';

/**
 * État local dashboard (pas de store Pinia).
 */
export function useDashboard() {
  const stats = ref<DashboardStats | null>(null);
  const loading = ref(false);
  const lastUpdated = ref<Date | null>(null);
  const { error, errorMessage, setError, clearError } = useApiError();

  async function fetchStats() {
    loading.value = true;
    clearError();
    try {
      stats.value = await getDashboardStats();
      lastUpdated.value = new Date();
      return stats.value;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    stats,
    loading,
    lastUpdated,
    error,
    errorMessage,
    fetchStats,
    clearError,
  };
}
