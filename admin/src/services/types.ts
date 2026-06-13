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

export interface ImportSkuResponse {
  batchId: number;
  totalCount: number;
  successCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{ line: number; reason: string }>;
  skippedRollCodes: string[];
}

export interface OrderPlan {
  id?: number;
  product_code: string;
  model: string;
  planned_qty: number;
  planned_weight: number;
  remark?: string | null;
}

export interface OrderItem {
  id: number;
  product_code: string;
  model: string;
  roll_code: string;
  weight: number;
  operator: string;
  device_id?: string | null;
  scan_seq: number;
  scanned_at: string;
  status: 'active' | 'deleted';
}

export interface OrderRow {
  id: number;
  order_no: string;
  vehicle_no: string;
  total_planned_qty: number;
  total_planned_weight: number;
  status: 'pending' | 'scanning' | 'completed' | 'cancelled';
  created_at: string;
  completed_at?: string | null;
  plans?: OrderPlan[];
}

export interface OrderDetail extends OrderRow {
  items: OrderItem[];
}

export interface CreateOrderResponse {
  id: number;
  orderNo: string;
}
