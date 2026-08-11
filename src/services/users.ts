import api from './api';
import type { AppUser, RoleName } from '../types';

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
