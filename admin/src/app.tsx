import { Button, Space } from 'antd';
import { history } from '@umijs/max';
import { getUser, logout } from './services/auth';

export const layout = () => ({
  title: '腈纶出库扫码系统',
  layout: 'mix',
  fixedHeader: true,
  fixSiderbar: true,
  contentWidth: 'Fluid',
  menuFooterRender: false,
  rightContentRender: false,
  actionsRender: () => [<UserActions key="user-actions" />],
  contentStyle: { padding: 24, background: '#f5f7fb' },
});

function UserActions() {
  const user = getUser();
  return (
    <Space style={{ paddingRight: 16, whiteSpace: 'nowrap' }}>
      <span>当前用户：{user?.name || user?.username || '未登录'}</span>
      <Button size="small" onClick={handleLogout}>退出</Button>
    </Space>
  );
}

function handleLogout(): void {
  logout();
  history.push('/login');
}
