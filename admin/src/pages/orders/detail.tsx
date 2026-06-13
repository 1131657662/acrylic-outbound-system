import { PageContainer } from '@ant-design/pro-components';
import { Alert, Button, Spin, Space } from 'antd';
import { history, useParams } from '@umijs/max';
import { ExportOrderButton } from './components/ExportOrderButton';
import { OrderItemTable } from './components/OrderItemTable';
import { OrderPlanTable } from './components/OrderPlanTable';
import { OrderSummary } from './components/OrderSummary';
import { useOrderDetail } from './hooks/useOrderDetail';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = Number(params.id);
  const { data, loading, reload } = useOrderDetail(orderId);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    return <PageContainer title="订单详情"><Alert type="error" message="订单 ID 错误" /></PageContainer>;
  }

  return (
    <PageContainer title={data ? `订单详情：${data.order_no}` : '订单详情'} extra={<PageActions order={data} />}>
      <Spin spinning={loading}>
        {data ? (
          <Space direction="vertical" size={0} style={{ width: '100%' }}>
            <OrderSummary order={data} />
            <OrderPlanTable plans={data.plans || []} />
            <OrderItemTable order={data} onDeleted={reload} />
          </Space>
        ) : null}
      </Spin>
    </PageContainer>
  );
}

function PageActions({ order }: { order: ReturnType<typeof useOrderDetail>['data'] }) {
  return (
    <Space>
      {order ? <ExportOrderButton order={order} /> : null}
      <Button onClick={() => history.push('/orders')}>返回列表</Button>
    </Space>
  );
}
