import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { Button, Popconfirm, Space, Tag, message } from 'antd';
import { history } from '@umijs/max';
import { useRef } from 'react';
import { cancelOrder, fetchOrders, revertOrder } from '../../services/orders';
import { getToken } from '../../services/auth';
import type { OrderRow } from '../../services/types';
import { ExportOrderButton } from './components/ExportOrderButton';

const statusText: Record<OrderRow['status'], string> = {
  pending: '待扫码',
  scanning: '扫码中',
  completed: '已完成',
  cancelled: '已取消',
};

const statusValueEnum = {
  pending: { text: '待扫码' },
  scanning: { text: '扫码中' },
  completed: { text: '已完成' },
  cancelled: { text: '已取消' },
};

export default function OrdersPage() {
  const actionRef = useRef<ActionType>();

  const columns: ProColumns<OrderRow>[] = [
    { title: '订单号', dataIndex: 'order_no', copyable: true },
    { title: '车牌号', dataIndex: 'vehicle_no' },
    { title: '计划件数', dataIndex: 'total_planned_qty', width: 100 },
    { title: '计划重量', dataIndex: 'total_planned_weight', width: 120 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueEnum: statusValueEnum,
      render: (_, row) => <Tag>{statusText[row.status]}</Tag>,
    },
    { title: '创建时间', dataIndex: 'created_at', width: 180, hideInSearch: true },
    {
      title: '操作',
      width: 240,
      hideInSearch: true,
      render: (_, row) => <OrderActions order={row} reload={() => actionRef.current?.reload()} />,
    },
  ];

  return (
    <PageContainer title="订单列表" extra={<Button type="primary" onClick={() => history.push('/orders/create')}>创建订单</Button>}>
      <ProTable<OrderRow>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={requestOrders}
        search={{ labelWidth: 'auto' }}
        dateFormatter="string"
      />
    </PageContainer>
  );
}

async function requestOrders(params: Record<string, unknown>) {
  if (!getToken()) {
    history.push('/login');
    return { data: [], success: true };
  }
  let data = await fetchOrders();

  // Client-side filtering (API doesn't support search params)
  if (params.order_no) {
    const kw = String(params.order_no).toLowerCase();
    data = data.filter(o => o.order_no.toLowerCase().includes(kw));
  }
  if (params.vehicle_no) {
    const kw = String(params.vehicle_no).toLowerCase();
    data = data.filter(o => o.vehicle_no.toLowerCase().includes(kw));
  }
  if (params.status) {
    data = data.filter(o => o.status === params.status);
  }

  return { data, success: true };
}

function OrderActions({ order, reload }: { order: OrderRow; reload: () => void }) {
  return (
    <Space wrap>
      <Button size="small" onClick={() => history.push(`/orders/detail/${order.id}`)}>查看</Button>
      {order.status === 'pending' ? <CancelButton order={order} reload={reload} /> : null}
      {order.status === 'completed' ? <RevertButton order={order} reload={reload} /> : null}
      <ExportOrderButton order={order} />
    </Space>
  );
}

function CancelButton({ order, reload }: { order: OrderRow; reload: () => void }) {
  return (
    <Popconfirm title="确认取消这个待扫码订单？" onConfirm={() => handleStatusChange(cancelOrder, order, reload, '订单已取消')}>
      <Button size="small" danger>取消</Button>
    </Popconfirm>
  );
}

function RevertButton({ order, reload }: { order: OrderRow; reload: () => void }) {
  return (
    <Popconfirm title="确认回退订单？库存会恢复，原扫码记录保留供修改。" onConfirm={() => handleStatusChange(revertOrder, order, reload, '订单已回退')}>
      <Button size="small">回退</Button>
    </Popconfirm>
  );
}

async function handleStatusChange(
  action: (orderId: number) => Promise<unknown>,
  order: OrderRow,
  reload: () => void,
  successText: string,
): Promise<void> {
  try {
    await action(order.id);
    message.success(successText);
    reload();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '操作失败');
  }
}
