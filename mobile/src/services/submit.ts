import type { LocalOrderItem } from '../types';
import { request } from '../utils/request';

export interface SubmitPayloadItem {
  clientItemId: string;
  rollCode: string;
  scanSeq: number;
  scannedAt: string;
  deviceId: string | null;
}

export interface SubmitResult {
  orderId: number;
  status: string;
  totalScanned: number;
  overPlanned: boolean;
  overCount: number;
}

export function buildSubmitPayload(items: LocalOrderItem[]): SubmitPayloadItem[] {
  return items.map(item => ({
    clientItemId: item.client_item_id,
    rollCode: item.roll_code,
    scanSeq: item.scan_seq,
    scannedAt: item.scanned_at,
    deviceId: item.device_id,
  }));
}

export async function submitOrderItems(orderId: number, items: LocalOrderItem[]): Promise<SubmitResult> {
  return request<SubmitResult>('/orders/submit', {
    method: 'POST',
    data: {
      orderId,
      items: buildSubmitPayload(items),
    },
  });
}
