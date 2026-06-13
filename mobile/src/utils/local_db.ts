import type { InventoryRow, LocalOrderItem, OrderRow } from '../types';

const ORDERS_KEY = 'acrylic_local_orders';
const INVENTORY_KEY = 'acrylic_local_inventory';
const SUMMARY_KEY = 'acrylic_sync_summary';
const SCAN_ITEMS_KEY = 'acrylic_local_scan_items';

export async function initLocalDb(): Promise<void> {
  // no-op: 纯 Storage 模式无需初始化
}

export async function saveOrders(orders: OrderRow[]): Promise<void> {
  uni.setStorageSync(ORDERS_KEY, orders);
}

export async function saveInventory(rows: InventoryRow[]): Promise<void> {
  uni.setStorageSync(INVENTORY_KEY, rows);
}

export async function getLocalOrders(): Promise<OrderRow[]> {
  return uni.getStorageSync(ORDERS_KEY) || [];
}

export function getSyncSummary(): SyncSummary | null {
  return uni.getStorageSync(SUMMARY_KEY) || null;
}

export async function saveSyncSummary(summary: SyncSummary): Promise<void> {
  uni.setStorageSync(SUMMARY_KEY, summary);
}

// ─── 出库记录 CRUD ───

export async function initScanTable(): Promise<void> {
  // no-op
}

export async function saveScanItem(item: LocalOrderItem): Promise<void> {
  const list = getScanItemsSync(item.order_id);
  const idx = list.findIndex(it => it.client_item_id === item.client_item_id);
  if (idx >= 0) list[idx] = item;
  else list.push(item);
  uni.setStorageSync(SCAN_ITEMS_KEY + '_' + item.order_id, list);
}

export async function getScanItems(orderId: number): Promise<LocalOrderItem[]> {
  return getScanItemsSync(orderId);
}

function getScanItemsSync(orderId: number): LocalOrderItem[] {
  return uni.getStorageSync(SCAN_ITEMS_KEY + '_' + orderId) || [];
}

export async function getMaxScanSeq(orderId: number): Promise<number> {
  const list = getScanItemsSync(orderId);
  return list.reduce((max, item) => Math.max(max, item.scan_seq), 0);
}

export async function deleteScanItem(clientItemId: string): Promise<void> {
  const allKeys = uni.getStorageInfoSync().keys.filter(k => k.startsWith(SCAN_ITEMS_KEY + '_'));
  for (const key of allKeys) {
    const list: LocalOrderItem[] = uni.getStorageSync(key) || [];
    const updated = list.map(it =>
      it.client_item_id === clientItemId ? { ...it, status: 'deleted' as const } : it
    );
    uni.setStorageSync(key, updated);
  }
}

export async function getLocalInventory(): Promise<InventoryRow[]> {
  return uni.getStorageSync(INVENTORY_KEY) || [];
}

export async function updateInventoryLocalStatus(rollCode: string, status: string): Promise<void> {
  const list: InventoryRow[] = uni.getStorageSync(INVENTORY_KEY) || [];
  const updated = list.map(row => row.roll_code === rollCode ? { ...row, status } as InventoryRow : row);
  uni.setStorageSync(INVENTORY_KEY, updated);
}

export async function findInventoryByRollCode(rollCode: string): Promise<InventoryRow | null> {
  const list: InventoryRow[] = uni.getStorageSync(INVENTORY_KEY) || [];
  return list.find(row => row.roll_code === rollCode) || null;
}

export async function findScanDuplicate(orderId: number, rollCode: string): Promise<LocalOrderItem | null> {
  const list = getScanItemsSync(orderId);
  return list.find(it => it.roll_code === rollCode && it.status === 'active') || null;
}

export async function markScanItemsSynced(clientItemIds: string[]): Promise<void> {
  if (!clientItemIds.length) return;
  const allKeys = uni.getStorageInfoSync().keys.filter(k => k.startsWith(SCAN_ITEMS_KEY + '_'));
  for (const key of allKeys) {
    const list: LocalOrderItem[] = uni.getStorageSync(key) || [];
    const updated = list.map(it =>
      clientItemIds.includes(it.client_item_id) ? { ...it, synced: 1 } : it
    );
    uni.setStorageSync(key, updated);
  }
}

export async function getUnsyncedItems(orderId?: number): Promise<LocalOrderItem[]> {
  if (orderId) {
    return getScanItemsSync(orderId).filter(it => it.synced === 0 && it.status === 'active');
  }
  const allKeys = uni.getStorageInfoSync().keys.filter(k => k.startsWith(SCAN_ITEMS_KEY + '_'));
  const items: LocalOrderItem[] = [];
  for (const key of allKeys) {
    const list: LocalOrderItem[] = uni.getStorageSync(key) || [];
    items.push(...list.filter(it => it.synced === 0 && it.status === 'active'));
  }
  return items;
}

export async function getUnsyncedActiveRollCodes(): Promise<Set<string>> {
  const items = await getUnsyncedItems();
  return new Set(items.map(it => it.roll_code));
}

interface SyncSummary {
  orderCount: number;
  inventoryCount: number;
  syncedAt: string;
}
