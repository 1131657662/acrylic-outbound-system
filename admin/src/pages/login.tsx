import { Button, Card, Form, Input, message } from 'antd';
import { history } from '@umijs/max';
import { login } from '../services/auth';

interface LoginFormValues {
  username: string;
  password: string;
}

export default function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();

  async function handleFinish(values: LoginFormValues): Promise<void> {
    try {
      await login(values.username, values.password);
      message.success('登录成功');
      history.push('/orders');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '登录失败');
    }
  }

  return (
    <div style={{ display: 'grid', minHeight: '100vh', placeItems: 'center', background: '#f5f7fb' }}>
      <Card title="腈纶出库扫码系统" style={{ width: 360 }}>
        <Form form={form} layout="vertical" initialValues={initialValues} onFinish={handleFinish}>
          <Form.Item name="username" label="账号" rules={[{ required: true, message: '请输入账号' }]}>
            <Input autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>登录</Button>
        </Form>
      </Card>
    </div>
  );
}

const initialValues: LoginFormValues = {
  username: 'admin',
  password: 'Admin@123456',
};
