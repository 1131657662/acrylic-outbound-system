import { apiRequest } from './api';

export interface UserRow {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'operator';
  created_at: string;
}

export function fetchUsers(): Promise<UserRow[]> {
  return apiRequest<UserRow[]>('/users');
}

export function createUser(data: {
  username: string;
  password: string;
  name: string;
  role?: string;
}): Promise<{ id: number; username: string; name: string; role: string }> {
  return apiRequest('/users', {
    method: 'POST',
    body: data,
  });
}

export function resetPassword(userId: number, password: string): Promise<{ message: string }> {
  return apiRequest(`/users/${userId}/reset-password`, {
    method: 'POST',
    body: { password },
  });
}
