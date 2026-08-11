import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { AppUser } from '../types';
import * as usersApi from '../services/users';

export const useUserStore = defineStore('user', () => {
  const users = ref<AppUser[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchUsers() {
    loading.value = true;
    error.value = null;
    try {
      users.value = await usersApi.listUsers();
    } catch (e: unknown) {
      error.value =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Failed to load users';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { users, loading, error, fetchUsers };
});
