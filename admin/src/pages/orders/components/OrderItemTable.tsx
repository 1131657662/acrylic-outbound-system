import { Button, Card, Popconfirm, Table, message } from 'antd';
import type { TableColumnsType } from 'antd';
import { deleteOrderItem } from '../../../services/orders';
import type { OrderDetail, OrderItem } from '../../../services/types';

interface OrderItemTableProps {
  order: OrderDetail;
  onDeleted: () => void;
}

export function OrderItemTable({ order, onDeleted }: OrderItemTableProps) {
  return (
    <Card title="出库明细" style={{ marginTop: 16 }}>
      <Table
        rowKey="id"
        columns={columns(order.status === 'scanning', onDeleted)}
        dataSource={order.items}
        pagination={{ pageSize: 20 }}
      />
    </Card>
  );
}

function columns(canDelete: boolean, onDeleted: () => void): TableColumnsType<OrderItem> {
  const baseColumns: TableColumnsType<OrderItem> = [
    { title: '序号', dataIndex: 'scan_seq', width: 80 },
    { title: '条码', dataIndex: 'roll_code', width: 160 },
    { title: '产品代码', dataIndex: 'product_code', width: 100 },
    { title: '型号', dataIndex: 'model' },
    { title: '重量', dataIndex: 'weight', width: 100, render: value => Number(value).toFixed(3) },
    { title: '操作人', dataIndex: 'operator', width: 100 },
    { title: '设备', dataIndex: 'device_id', width: 120, render: value => value || '-' },
    { title: '扫码时间', dataIndex: 'scanned_at', width: 180 },
  ];
  if (!canDelete) return baseColumns;
  return [...baseColumns, { title: '操作', width: 90, render: (_, item) => <DeleteButton item={item} onDeleted={onDeleted} /> }];
}

function DeleteButton({ item, onDeleted }: { item: OrderItem; onDeleted: () => void }) {
  async function handleDelete(): Promise<void> {
    try {
      await deleteOrderItem(item.id);
      message.success('出库记录已作废');
      onDeleted();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '作废失败');
    }
  }

  return (
    <Popconfirm title="确认作废这条出库记录？" onConfirm={handleDelete}>
      <Button size="small" danger>作废</Button>
    </Popconfirm>
  );
}
