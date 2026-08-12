import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { AppUser, AppRole, AppPermission, RoleName } from '../types';
import * as usersApi from '../services/users';

function errMsg(e: unknown, fallback: string) {
  return (
    (e as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback
  );
}

export const useUserStore = defineStore('user', () => {
  const users = ref<AppUser[]>([]);
  const roles = ref<AppRole[]>([]);
  const permissions = ref<AppPermission[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetchUsers() {
    loading.value = true;
    error.value = null;
    try {
      users.value = await usersApi.listUsers();
    } catch (e: unknown) {
      error.value = errMsg(e, 'Impossible de charger les utilisateurs');
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function fetchRoles() {
    roles.value = await usersApi.listRoles();
  }

  async function fetchPermissions() {
    permissions.value = await usersApi.listPermissions();
  }

  async function createUser(payload: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: RoleName;
  }) {
    await usersApi.createUser(payload);
    await fetchUsers();
  }

  async function updateUser(
    id: string,
    payload: Partial<{ firstName: string; lastName: string; isActive: boolean; role: RoleName }>
  ) {
    await usersApi.updateUser(id, payload);
    await fetchUsers();
  }

  async function removeUser(id: string) {
    await usersApi.deleteUser(id);
    await fetchUsers();
  }

  async function createRole(name: string, permissionCodes: string[]) {
    await usersApi.createRole({ name, permissions: permissionCodes });
    await fetchRoles();
  }

  async function saveRolePermissions(id: string, permissionCodes: string[]) {
    await usersApi.updateRolePermissions(id, permissionCodes);
    await fetchRoles();
  }

  async function removeRole(id: string) {
    await usersApi.deleteRole(id);
    await fetchRoles();
  }

  return {
    users,
    roles,
    permissions,
    loading,
    error,
    fetchUsers,
    fetchRoles,
    fetchPermissions,
    createUser,
    updateUser,
    removeUser,
    createRole,
    saveRolePermissions,
    removeRole,
  };
});
