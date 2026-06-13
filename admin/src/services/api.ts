export const API_BASE = process.env.UMI_APP_API_BASE || 'http://localhost:7001/api';

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  auth?: boolean;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: headers(options),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json() as Promise<T>;
}

function headers(options: RequestOptions): HeadersInit {
  const value: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = localStorage.getItem('acrylic_token');
  if (options.auth !== false && token) value.Authorization = `Bearer ${token}`;
  return value;
}

async function errorMessage(response: Response): Promise<string> {
  const text = await response.text();
  try {
    const data = JSON.parse(text) as { message?: string };
    return data.message || text;
  } catch {
    return text;
  }
}
