import { Card, Descriptions, Tag } from 'antd';
import type { OrderDetail, OrderRow } from '../../../services/types';

const statusText: Record<OrderRow['status'], string> = {
  pending: '待扫码',
  scanning: '扫码中',
  completed: '已完成',
  cancelled: '已取消',
};

export function OrderSummary({ order }: { order: OrderDetail }) {
  const actualQty = order.items.length;
  const actualWeight = order.items.reduce((sum, item) => sum + Number(item.weight), 0);

  return (
    <Card>
      <Descriptions column={3}>
        <Descriptions.Item label="订单号">{order.order_no}</Descriptions.Item>
        <Descriptions.Item label="车牌号">{order.vehicle_no}</Descriptions.Item>
        <Descriptions.Item label="状态"><Tag>{statusText[order.status]}</Tag></Descriptions.Item>
        <Descriptions.Item label="计划件数">{order.total_planned_qty}</Descriptions.Item>
        <Descriptions.Item label="计划重量">{Number(order.total_planned_weight).toFixed(3)}</Descriptions.Item>
        <Descriptions.Item label="已扫件数">{actualQty}</Descriptions.Item>
        <Descriptions.Item label="已扫重量">{actualWeight.toFixed(3)}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{order.created_at}</Descriptions.Item>
        <Descriptions.Item label="完成时间">{order.completed_at || '-'}</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
