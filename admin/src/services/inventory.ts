import { apiRequest } from './api';
import type { ImportSkuResponse } from './types';

export function importSku(content: string, fileName: string): Promise<ImportSkuResponse> {
  return apiRequest<ImportSkuResponse>('/inventory/import', {
    method: 'POST',
    body: { fileName, content },
  });
}
