import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import { Tag } from 'antd';
import { fetchInventory } from '../../services/inventory';
import type { InventoryRow } from '../../services/inventory';

const statusMap: Record<string, { text: string; color: string }> = {
  available: { text: '可用', color: 'green' },
  shipped: { text: '已出库', color: 'red' },
};

const columns: ProColumns<InventoryRow>[] = [
  { title: '卷码', dataIndex: 'roll_code', width: 200 },
  { title: '型号', dataIndex: 'model', width: 180 },
  { title: '重量(kg)', dataIndex: 'weight', width: 100, render: (_, row) => row.weight?.toFixed(3) },
  { title: '产品代码', dataIndex: 'product_code', width: 100 },
  {
    title: '状态',
    dataIndex: 'status',
    width: 80,
    render: (_, row) => {
      const s = statusMap[row.status] || { text: row.status, color: 'default' };
      return <Tag color={s.color}>{s.text}</Tag>;
    },
    valueEnum: {
      available: { text: '可用' },
      shipped: { text: '已出库' },
    },
  },
  { title: '导入时间', dataIndex: 'import_time', width: 160 },
];

export default function InventoryPage() {
  return (
    <PageContainer title="库存查看">
      <ProTable<InventoryRow>
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const data = await fetchInventory({
            status: params.status as string | undefined,
            product_code: params.product_code as string | undefined,
            roll_code: params.roll_code as string | undefined,
            model: params.model as string | undefined,
            limit: 500,
          });
          return { data, success: true };
        }}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      />
    </PageContainer>
  );
}
