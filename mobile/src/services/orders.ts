import type { OrderRow } from '../types';
import { getLocalOrders } from '../utils/local_db';

export async function localOrders(): Promise<OrderRow[]> {
  return await getLocalOrders();
}
