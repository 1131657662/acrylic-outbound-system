import { getApiBase, getToken } from './storage';

interface RequestOptions {
  method?: 'GET' | 'POST';
  data?: unknown;
  token?: string;
}

export function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${getApiBase()}${url}`,
      method: options.method || 'GET',
      data: options.data,
      header: headers(options),
      success: response => {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T);
          return;
        }
        reject(new Error(errorMessage(response.data)));
      },
      fail: reject,
    });
  });
}

function headers(options: RequestOptions): Record<string, string> {
  const value: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = options.token || getToken();
  if (token) value.Authorization = `Bearer ${token}`;
  return value;
}

function errorMessage(data: unknown): string {
  if (typeof data === 'object' && data && 'message' in data) {
    return String((data as { message: unknown }).message);
  }
  return typeof data === 'string' ? data : '请求失败';
}
