import { Modal, Form, Input, Select, message } from 'antd';
import { createUser } from '../../services/users';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateUserModal({ visible, onClose, onSuccess }: Props) {
  const [form] = Form.useForm();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await createUser(values);
      message.success('用户创建成功');
      form.resetFields();
      onSuccess();
    } catch (error) {
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  return (
    <Modal
      title="新建用户"
      open={visible}
      onOk={handleOk}
      onCancel={onClose}
      destroyOnClose
    >
      <Form form={form} layout="vertical" initialValues={{ role: 'operator' }}>
        <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input placeholder="请输入用户名" />
        </Form.Item>
        <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password placeholder="请输入密码" />
        </Form.Item>
        <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
          <Input placeholder="请输入姓名" />
        </Form.Item>
        <Form.Item name="role" label="角色">
          <Select options={[{ value: 'operator', label: '操作员' }, { value: 'admin', label: '管理员' }]} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
