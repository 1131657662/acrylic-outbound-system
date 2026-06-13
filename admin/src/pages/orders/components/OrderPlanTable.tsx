import { Card, Table } from 'antd';
import type { TableColumnsType } from 'antd';
import type { OrderPlan } from '../../../services/types';

const columns: TableColumnsType<OrderPlan> = [
  { title: '产品代码', dataIndex: 'product_code', width: 120 },
  { title: '型号', dataIndex: 'model' },
  { title: '计划件数', dataIndex: 'planned_qty', width: 110 },
  {
    title: '计划重量',
    dataIndex: 'planned_weight',
    width: 120,
    render: value => Number(value).toFixed(3),
  },
  { title: '备注', dataIndex: 'remark' },
];

export function OrderPlanTable({ plans }: { plans: OrderPlan[] }) {
  return (
    <Card title="计划明细" style={{ marginTop: 16 }}>
      <Table rowKey="id" columns={columns} dataSource={plans} pagination={false} />
    </Card>
  );
}
