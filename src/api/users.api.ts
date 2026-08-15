import api from './client';
import type { AppUser, AppRole, AppPermission, RoleName } from '../types';

export async function listUsers() {
  const { data } = await api.get<AppUser[]>('/users');
  return data;
}

export async function createUser(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: RoleName;
}) {
  const { data } = await api.post('/users', payload);
  return data;
}

export async function updateUser(
  id: string,
  payload: Partial<{ firstName: string; lastName: string; isActive: boolean; role: RoleName }>
) {
  const { data } = await api.patch(`/users/${id}`, payload);
  return data;
}

export async function deleteUser(id: string) {
  const { data } = await api.delete(`/users/${id}`);
  return data;
}

export async function listRoles() {
  const { data } = await api.get<AppRole[]>('/roles');
  return data;
}

export async function listPermissions() {
  const { data } = await api.get<AppPermission[]>('/permissions');
  return data;
}

export async function createRole(payload: { name: string; permissions: string[] }) {
  const { data } = await api.post('/roles', payload);
  return data;
}

export async function updateRolePermissions(id: string, permissions: string[]) {
  const { data } = await api.put(`/roles/${id}/permissions`, { permissions });
  return data;
}

export async function deleteRole(id: string) {
  const { data } = await api.delete(`/roles/${id}`);
  return data;
}
