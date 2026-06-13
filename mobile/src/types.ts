export interface UserInfo {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'operator';
}

export interface LoginResponse {
  token: string;
  user: UserInfo;
}

export interface OrderPlan {
  id: number;
  order_id: number;
  product_code: string;
  model: string;
  planned_qty: number;
  planned_weight: number;
  remark?: string | null;
}

export interface OrderRow {
  id: number;
  order_no: string;
  vehicle_no: string;
  total_planned_qty: number;
  total_planned_weight: number;
  status: 'pending' | 'scanning' | 'completed' | 'cancelled';
  created_at: string;
  plans?: OrderPlan[];
}

export interface InventoryRow {
  id: number;
  roll_code: string;
  model: string;
  weight: number;
  product_code: string;
  status: 'available' | 'shipped';
}

export interface LocalOrderItem {
  client_item_id: string;
  order_id: number;
  product_code: string;
  model: string;
  roll_code: string;
  weight: number;
  scan_seq: number;
  scanned_at: string;
  status: 'active' | 'deleted';
  synced: number;
  device_id: string | null;
  operator: string;
}

export interface ProductScanStat {
  product_code: string;
  model: string;
  planned_qty: number;
  scanned_qty: number;
  planned_weight: number;
  scanned_weight: number;
  diff_qty: number;
}

export interface ScanSummary {
  total_planned_qty: number;
  total_planned_weight: number;
  total_scanned_qty: number;
  total_scanned_weight: number;
  products: ProductScanStat[];
}
