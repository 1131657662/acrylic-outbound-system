import type { UserInfo } from '../types';

const TOKEN_KEY = 'acrylic_token';
const USER_KEY = 'acrylic_user';
const API_BASE_KEY = 'acrylic_api_base';

export function getToken(): string {
  return uni.getStorageSync(TOKEN_KEY) || '';
}

export function setToken(token: string): void {
  uni.setStorageSync(TOKEN_KEY, token);
}

export function getUser(): UserInfo | null {
  return uni.getStorageSync(USER_KEY) || null;
}

export function setUser(user: UserInfo): void {
  uni.setStorageSync(USER_KEY, user);
}

export function clearSession(): void {
  uni.removeStorageSync(TOKEN_KEY);
  uni.removeStorageSync(USER_KEY);
}

export function getApiBase(): string {
  return uni.getStorageSync(API_BASE_KEY) || 'http://114.67.203.242/acrylic/api';
}

export function setApiBase(value: string): void {
  uni.setStorageSync(API_BASE_KEY, normalizeApiBase(value));
}

function normalizeApiBase(value: string): string {
  const trimmed = value.trim().replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}
