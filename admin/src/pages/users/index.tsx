import { PageContainer, ProTable } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';
import { Button, Modal, Form, Input, Space, Tag, message } from 'antd';
import { useRef, useState } from 'react';
import { fetchUsers, resetPassword } from '../../services/users';
import type { UserRow } from '../../services/users';
import { CreateUserModal } from './create';

const roleText: Record<string, string> = {
  admin: '管理员',
  operator: '操作员',
};

export default function UsersPage() {
  const actionRef = useRef<ActionType>();
  const [createVisible, setCreateVisible] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetForm] = Form.useForm();

  const handleResetPassword = async () => {
    if (!resetTarget) return;
    try {
      const values = await resetForm.validateFields();
      await resetPassword(resetTarget.id, values.password);
      message.success('密码已重置');
      setResetTarget(null);
      resetForm.resetFields();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  return (
    <PageContainer
      title="用户管理"
      extra={<Button type="primary" onClick={() => setCreateVisible(true)}>新建用户</Button>}
    >
      <ProTable<UserRow>
        actionRef={actionRef}
        rowKey="id"
        search={false}
        request={async () => {
          const data = await fetchUsers();
          return { data, success: true };
        }}
        columns={[
          { title: '用户名', dataIndex: 'username' },
          { title: '姓名', dataIndex: 'name' },
          {
            title: '角色',
            dataIndex: 'role',
            render: (_, row) => <Tag color={row.role === 'admin' ? 'blue' : 'default'}>{roleText[row.role] || row.role}</Tag>,
          },
          { title: '创建时间', dataIndex: 'created_at', width: 180 },
          {
            title: '操作',
            width: 160,
            render: (_, row) => (
              <Space>
                <Button size="small" onClick={() => { setResetTarget(row); resetForm.resetFields(); }}>重置密码</Button>
              </Space>
            ),
          },
        ]}
      />
      <CreateUserModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSuccess={() => {
          setCreateVisible(false);
          actionRef.current?.reload();
        }}
      />
      <Modal
        title={`重置密码 — ${resetTarget?.name || ''}`}
        open={!!resetTarget}
        onOk={handleResetPassword}
        onCancel={() => { setResetTarget(null); resetForm.resetFields(); }}
        destroyOnClose
      >
        <Form form={resetForm} layout="vertical">
          <Form.Item name="password" label="新密码" rules={[{ required: true, message: '请输入新密码' }]}>
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
