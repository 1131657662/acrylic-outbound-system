import type { InventoryRow, OrderRow } from '../types';
import { initLocalDb, saveInventory, saveOrders, saveSyncSummary, getUnsyncedActiveRollCodes } from '../utils/local_db';
import { request } from '../utils/request';

export interface SyncResult {
  orderCount: number;
  inventoryCount: number;
  replayedCount: number;
  syncedAt: string;
}

export async function syncAll(): Promise<SyncResult> {
  await initLocalDb();

  const orders = await request<OrderRow[]>('/orders/pending');
  let inventory = await request<InventoryRow[]>('/inventory/sync');

  // 下载库存后重放本地未同步记录
  const unsyncedRollCodes = await getUnsyncedActiveRollCodes();
  let replayedCount = 0;
  if (unsyncedRollCodes.size > 0) {
    inventory = inventory.map(row =>
      unsyncedRollCodes.has(row.roll_code)
        ? { ...row, status: 'shipped' as const }
        : row
    );
    replayedCount = unsyncedRollCodes.size;
  }

  await saveOrders(orders);
  await saveInventory(inventory);

  const result: SyncResult = {
    orderCount: orders.length,
    inventoryCount: inventory.length,
    replayedCount,
    syncedAt: new Date().toLocaleString(),
  };
  await saveSyncSummary(result);
  return result;
}
