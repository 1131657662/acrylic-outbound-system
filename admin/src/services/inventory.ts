import { apiRequest } from './api';
import type { ImportSkuResponse } from './types';

export interface InventoryRow {
  id: number;
  roll_code: string;
  model: string;
  weight: number;
  product_code: string;
  status: 'available' | 'shipped';
  import_time: string;
  updated_at: string;
}

export function importSku(content: string, fileName: string): Promise<ImportSkuResponse> {
  return apiRequest<ImportSkuResponse>('/inventory/import', {
    method: 'POST',
    body: { fileName, content },
  });
}

export function fetchInventory(params?: {
  status?: string;
  product_code?: string;
  roll_code?: string;
  model?: string;
  limit?: number;
}): Promise<InventoryRow[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.product_code) query.set('product_code', params.product_code);
  if (params?.roll_code) query.set('roll_code', params.roll_code);
  if (params?.model) query.set('model', params.model);
  if (params?.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiRequest<InventoryRow[]>(`/inventory${qs ? '?' + qs : ''}`);
}
