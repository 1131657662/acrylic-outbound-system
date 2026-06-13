import type { InventoryRow, LocalOrderItem, OrderRow } from '../types';

declare const plus: {
  sqlite?: {
    isOpenDatabase(options: DbName): boolean;
    openDatabase(options: DbOpenOptions): void;
    executeSql(options: DbSqlOptions): void;
    selectSql(options: DbSqlOptions): void;
  };
};

interface DbName {
  name: string;
  path: string;
}

interface DbOpenOptions extends DbName {
  success: () => void;
  fail: (error: unknown) => void;
}

interface DbSqlOptions extends DbName {
  sql: string | string[];
  success: (result?: unknown) => void;
  fail: (error: unknown) => void;
}

interface SyncSummary {
  orderCount: number;
  inventoryCount: number;
  syncedAt: string;
}

const DB: DbName = { name: 'acrylic_scan', path: '_doc/acrylic_scan.db' };
const ORDERS_KEY = 'acrylic_local_orders';
const INVENTORY_KEY = 'acrylic_local_inventory';
const SUMMARY_KEY = 'acrylic_sync_summary';

export async function initLocalDb(): Promise<void> {
  if (!hasSqlite()) return;
  await openDb();
  await execute([
    'CREATE TABLE IF NOT EXISTS orders_cache (id INTEGER PRIMARY KEY, data TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS inventory_cache (roll_code TEXT PRIMARY KEY, data TEXT NOT NULL)',
    'CREATE TABLE IF NOT EXISTS meta_cache (key TEXT PRIMARY KEY, value TEXT NOT NULL)',
  ]);
}

export async function saveOrders(orders: OrderRow[]): Promise<void> {
  if (!hasSqlite()) {
    uni.setStorageSync(ORDERS_KEY, orders);
    return;
  }
  await initLocalDb();
  await execute('DELETE FROM orders_cache');
  await execute(orders.map(order => insertOrderSql(order)));
}

export async function saveInventory(rows: InventoryRow[]): Promise<void> {
  if (!hasSqlite()) {
    uni.setStorageSync(INVENTORY_KEY, rows);
    return;
  }
  await initLocalDb();
  await execute('DELETE FROM inventory_cache');
  await execute(rows.map(row => insertInventorySql(row)));
}

export async function getLocalOrders(): Promise<OrderRow[]> {
  if (!hasSqlite()) return uni.getStorageSync(ORDERS_KEY) || [];
  await initLocalDb();
  const rows = await select<{ data: string }>('SELECT data FROM orders_cache ORDER BY id DESC');
  return rows.map(row => JSON.parse(row.data) as OrderRow);
}

export async function saveSyncSummary(summary: SyncSummary): Promise<void> {
  uni.setStorageSync(SUMMARY_KEY, summary);
  if (!hasSqlite()) return;
  await initLocalDb();
  await execute(`REPLACE INTO meta_cache (key, value) VALUES ('sync_summary', '${escapeSql(JSON.stringify(summary))}')`);
}

export function getSyncSummary(): SyncSummary | null {
  return uni.getStorageSync(SUMMARY_KEY) || null;
}

function hasSqlite(): boolean {
  return typeof plus !== 'undefined' && Boolean(plus.sqlite);
}

function openDb(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (plus.sqlite?.isOpenDatabase(DB)) {
      resolve();
      return;
    }
    plus.sqlite?.openDatabase({ ...DB, success: resolve, fail: reject });
  });
}

function execute(sql: string | string[]): Promise<void> {
  if (Array.isArray(sql) && sql.length === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    plus.sqlite?.executeSql({ ...DB, sql, success: () => resolve(), fail: reject });
  });
}

function select<T>(sql: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    plus.sqlite?.selectSql({ ...DB, sql, success: result => resolve(result as T[]), fail: reject });
  });
}

function insertOrderSql(order: OrderRow): string {
  return `REPLACE INTO orders_cache (id, data) VALUES (${order.id}, '${escapeSql(JSON.stringify(order))}')`;
}

function insertInventorySql(row: InventoryRow): string {
  return `REPLACE INTO inventory_cache (roll_code, data) VALUES ('${escapeSql(row.roll_code)}', '${escapeSql(JSON.stringify(row))}')`;
}

function escapeSql(value: string): string {
  return value.replace(/'/g, "''");
}

// ─── 本地出库记录 (local_order_items) ───

const SCAN_ITEMS_KEY = 'acrylic_local_scan_items';

export async function initScanTable(): Promise<void> {
  if (!hasSqlite()) return;
  await initLocalDb();
  await execute(
    'CREATE TABLE IF NOT EXISTS local_order_items (' +
    'client_item_id TEXT PRIMARY KEY, order_id INTEGER NOT NULL, product_code TEXT NOT NULL, ' +
    'model TEXT NOT NULL, roll_code TEXT NOT NULL, weight REAL NOT NULL, scan_seq INTEGER NOT NULL, ' +
    'scanned_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT \'active\', synced INTEGER NOT NULL DEFAULT 0, ' +
    'device_id TEXT, operator TEXT NOT NULL)'
  );
}

export async function saveScanItem(item: LocalOrderItem): Promise<void> {
  if (!hasSqlite()) {
    const list = getScanItemsSync(item.order_id);
    const idx = list.findIndex(it => it.client_item_id === item.client_item_id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    uni.setStorageSync(SCAN_ITEMS_KEY + '_' + item.order_id, list);
    return;
  }
  await initScanTable();
  await execute(
    `REPLACE INTO local_order_items (client_item_id, order_id, product_code, model, roll_code, weight, scan_seq, scanned_at, status, synced, device_id, operator) ` +
    `VALUES ('${escapeSql(item.client_item_id)}', ${item.order_id}, '${escapeSql(item.product_code)}', ` +
    `'${escapeSql(item.model)}', '${escapeSql(item.roll_code)}', ${item.weight}, ${item.scan_seq}, ` +
    `'${item.scanned_at}', '${item.status}', ${item.synced}, ` +
    `${item.device_id ? `'${escapeSql(item.device_id)}'` : 'NULL'}, '${escapeSql(item.operator)}')`
  );
}

export async function getScanItems(orderId: number): Promise<LocalOrderItem[]> {
  if (!hasSqlite()) return getScanItemsSync(orderId);
  await initScanTable();
  const rows = await select<Record<string, unknown>>(
    `SELECT * FROM local_order_items WHERE order_id = ${orderId} ORDER BY scan_seq ASC`
  );
  return rows.map(row => ({
    client_item_id: row.client_item_id as string,
    order_id: row.order_id as number,
    product_code: row.product_code as string,
    model: row.model as string,
    roll_code: row.roll_code as string,
    weight: row.weight as number,
    scan_seq: row.scan_seq as number,
    scanned_at: row.scanned_at as string,
    status: row.status as LocalOrderItem['status'],
    synced: row.synced as number,
    device_id: (row.device_id as string) || null,
    operator: row.operator as string,
  }));
}

function getScanItemsSync(orderId: number): LocalOrderItem[] {
  return uni.getStorageSync(SCAN_ITEMS_KEY + '_' + orderId) || [];
}

export async function getMaxScanSeq(orderId: number): Promise<number> {
  if (!hasSqlite()) {
    const list = getScanItemsSync(orderId);
    return list.reduce((max, item) => Math.max(max, item.scan_seq), 0);
  }
  await initScanTable();
  const rows = await select<{ max_seq: number }>(
    `SELECT COALESCE(MAX(scan_seq), 0) as max_seq FROM local_order_items WHERE order_id = ${orderId}`
  );
  return rows[0].max_seq;
}

export async function deleteScanItem(clientItemId: string): Promise<void> {
  if (!hasSqlite()) {
    const allKeys = uni.getStorageInfoSync().keys.filter(k => k.startsWith(SCAN_ITEMS_KEY + '_'));
    for (const key of allKeys) {
      const list: LocalOrderItem[] = uni.getStorageSync(key) || [];
      const updated = list.map(it =>
        it.client_item_id === clientItemId ? { ...it, status: 'deleted' as const } : it
      );
      uni.setStorageSync(key, updated);
    }
    return;
  }
  await initScanTable();
  await execute(
    `UPDATE local_order_items SET status = 'deleted' WHERE client_item_id = '${escapeSql(clientItemId)}'`
  );
}

export async function getLocalInventory(): Promise<InventoryRow[]> {
  if (!hasSqlite()) return uni.getStorageSync(INVENTORY_KEY) || [];
  const rows = await select<Record<string, unknown>>(
    'SELECT data FROM inventory_cache'
  );
  return rows.map(row => JSON.parse(row.data as string) as InventoryRow);
}

export async function updateInventoryLocalStatus(rollCode: string, status: string): Promise<void> {
  if (!hasSqlite()) {
    const list: InventoryRow[] = uni.getStorageSync(INVENTORY_KEY) || [];
    const updated = list.map(row => row.roll_code === rollCode ? { ...row, status } : row);
    uni.setStorageSync(INVENTORY_KEY, updated);
    await saveInventory(updated);
    return;
  }
  await initLocalDb();
  const rows = await select<{ data: string }>(
    `SELECT data FROM inventory_cache WHERE roll_code = '${escapeSql(rollCode)}'`
  );
  if (!rows.length) return;
  const row = JSON.parse(rows[0].data);
  row.status = status;
  await execute(
    `UPDATE inventory_cache SET data = '${escapeSql(JSON.stringify(row))}' WHERE roll_code = '${escapeSql(rollCode)}'`
  );
}

export async function findInventoryByRollCode(rollCode: string): Promise<InventoryRow | null> {
  if (!hasSqlite()) {
    const list: InventoryRow[] = uni.getStorageSync(INVENTORY_KEY) || [];
    return list.find(row => row.roll_code === rollCode) || null;
  }
  const rows = await select<{ data: string }>(
    `SELECT data FROM inventory_cache WHERE roll_code = '${escapeSql(rollCode)}'`
  );
  return rows.length ? JSON.parse(rows[0].data) as InventoryRow : null;
}

export async function findScanDuplicate(orderId: number, rollCode: string): Promise<LocalOrderItem | null> {
  if (!hasSqlite()) {
    const list = getScanItemsSync(orderId);
    return list.find(it => it.roll_code === rollCode && it.status === 'active') || null;
  }
  await initScanTable();
  const rows = await select<Record<string, unknown>>(
    `SELECT * FROM local_order_items WHERE order_id = ${orderId} AND roll_code = '${escapeSql(rollCode)}' AND status = 'active'`
  );
  if (!rows.length) return null;
  return {
    client_item_id: rows[0].client_item_id as string,
    order_id: rows[0].order_id as number,
    product_code: rows[0].product_code as string,
    model: rows[0].model as string,
    roll_code: rows[0].roll_code as string,
    weight: rows[0].weight as number,
    scan_seq: rows[0].scan_seq as number,
    scanned_at: rows[0].scanned_at as string,
    status: rows[0].status as LocalOrderItem['status'],
    synced: rows[0].synced as number,
    device_id: (rows[0].device_id as string) || null,
    operator: rows[0].operator as string,
  };
}

export async function markScanItemsSynced(clientItemIds: string[]): Promise<void> {
  if (!clientItemIds.length) return;
  if (!hasSqlite()) {
    const allKeys = uni.getStorageInfoSync().keys.filter(k => k.startsWith(SCAN_ITEMS_KEY + '_'));
    for (const key of allKeys) {
      const list: LocalOrderItem[] = uni.getStorageSync(key) || [];
      const updated = list.map(it =>
        clientItemIds.includes(it.client_item_id) ? { ...it, synced: 1 } : it
      );
      uni.setStorageSync(key, updated);
    }
    return;
  }
  await initScanTable();
  const ids = clientItemIds.map(id => `'${escapeSql(id)}'`).join(',');
  await execute(`UPDATE local_order_items SET synced = 1 WHERE client_item_id IN (${ids})`);
}

export async function getUnsyncedItems(orderId?: number): Promise<LocalOrderItem[]> {
  if (!hasSqlite()) {
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
  await initScanTable();
  let sql = 'SELECT * FROM local_order_items WHERE synced = 0 AND status = \'active\'';
  if (orderId) sql += ` AND order_id = ${orderId}`;
  sql += ' ORDER BY scan_seq ASC';
  const rows = await select<Record<string, unknown>>(sql);
  return rows.map(row => ({
    client_item_id: row.client_item_id as string,
    order_id: row.order_id as number,
    product_code: row.product_code as string,
    model: row.model as string,
    roll_code: row.roll_code as string,
    weight: row.weight as number,
    scan_seq: row.scan_seq as number,
    scanned_at: row.scanned_at as string,
    status: row.status as LocalOrderItem['status'],
    synced: row.synced as number,
    device_id: (row.device_id as string) || null,
    operator: row.operator as string,
  }));
}

export async function getUnsyncedActiveRollCodes(): Promise<Set<string>> {
  const items = await getUnsyncedItems();
  return new Set(items.map(it => it.roll_code));
}


