import type { LoginResponse } from '../types';
import { request } from '../utils/request';
import { setApiBase, setToken, setUser } from '../utils/storage';

interface LoginPayload {
  apiBase: string;
  username: string;
  password: string;
}

export async function login(payload: LoginPayload): Promise<void> {
  setApiBase(payload.apiBase);
  const result = await request<LoginResponse>('/auth/login', {
    method: 'POST',
    data: {
      username: payload.username.trim(),
      password: payload.password,
    },
    token: '',
  });
  setToken(result.token);
  setUser(result.user);
}
