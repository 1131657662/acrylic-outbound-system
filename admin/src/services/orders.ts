import { apiRequest, API_BASE } from './api';
import type { CreateOrderResponse, OrderDetail, OrderRow } from './types';

export interface CreateOrderPayload {
  vehicleNo: string;
  plans: Array<{ productCode: string; plannedQty: number; remark?: string }>;
}

export function fetchOrders(): Promise<OrderRow[]> {
  return apiRequest<OrderRow[]>('/orders');
}

export function fetchOrderDetail(orderId: number): Promise<OrderDetail> {
  return apiRequest<OrderDetail>(`/orders/${orderId}`);
}

export function createOrder(payload: CreateOrderPayload): Promise<CreateOrderResponse> {
  return apiRequest<CreateOrderResponse>('/orders/create', {
    method: 'POST',
    body: payload,
  });
}

export function cancelOrder(orderId: number): Promise<{ id: number; status: OrderRow['status'] }> {
  return apiRequest(`/orders/${orderId}/cancel`, { method: 'POST' });
}

export function revertOrder(orderId: number): Promise<{ id: number; status: OrderRow['status'] }> {
  return apiRequest(`/orders/${orderId}/revert`, { method: 'POST' });
}

export function deleteOrderItem(itemId: number): Promise<{ id: number; status: 'deleted' }> {
  return apiRequest(`/order-items/${itemId}/delete`, { method: 'POST' });
}

export function exportOrderUrl(orderId: number): string {
  return `${API_BASE}/orders/${orderId}/export`;
}

export async function exportOrder(orderId: number): Promise<Blob> {
  const token = localStorage.getItem('acrylic_token');
  const response = await fetch(exportOrderUrl(orderId), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(await response.text());
  return response.blob();
}
