import { PageContainer } from '@ant-design/pro-components';
import { Button, Card, Form, Input, InputNumber, Space, message } from 'antd';
import { history } from '@umijs/max';
import type { CSSProperties } from 'react';
import { createOrder } from '../../services/orders';

interface OrderFormValues {
  vehicleNo: string;
  plans: Array<{ productCode: string; plannedQty: number; remark?: string }>;
}

export default function OrderCreatePage() {
  async function handleFinish(values: OrderFormValues): Promise<void> {
    try {
      const result = await createOrder(values);
      message.success(`订单已创建：${result.orderNo}`);
      history.push('/orders');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建失败');
    }
  }

  return (
    <PageContainer title="创建订单">
      <Card>
        <Form layout="vertical" initialValues={{ plans: [{}] }} onFinish={handleFinish}>
          <Form.Item name="vehicleNo" label="车牌号" rules={[{ required: true, message: '请输入车牌号' }]}>
            <Input style={{ maxWidth: 360 }} placeholder="例如：浙C12345" />
          </Form.Item>
          <PlanList />
          <Space style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit">创建订单</Button>
            <Button onClick={() => history.push('/orders')}>返回列表</Button>
          </Space>
        </Form>
      </Card>
    </PageContainer>
  );
}

function PlanList() {
  return (
    <Form.List name="plans">
      {(fields, operation) => (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {fields.map((field, index) => (
            <div key={field.key} style={planBlockStyle}>
              <div style={{ marginBottom: 12, fontWeight: 600 }}>{`产品明细 ${index + 1}`}</div>
              <Space align="start" wrap>
                <Form.Item name={[field.name, 'productCode']} label="产品代码" rules={[{ required: true, message: '请输入产品代码' }]}>
                  <Input placeholder="如 ABC" style={{ width: 180 }} />
                </Form.Item>
                <Form.Item name={[field.name, 'plannedQty']} label="计划件数" rules={[{ required: true, message: '请输入计划件数' }]}>
                  <InputNumber min={1} precision={0} style={{ width: 160 }} />
                </Form.Item>
                <Form.Item name={[field.name, 'remark']} label="备注">
                  <Input placeholder="可选" style={{ width: 260 }} />
                </Form.Item>
                <Button danger disabled={fields.length === 1} onClick={() => operation.remove(field.name)}>删除</Button>
              </Space>
            </div>
          ))}
          <Button onClick={() => operation.add()}>添加产品代码</Button>
        </Space>
      )}
    </Form.List>
  );
}

const planBlockStyle: CSSProperties = {
  border: '1px solid #e5e6eb',
  borderRadius: 6,
  padding: 16,
};
