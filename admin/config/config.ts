import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: '腈纶出库扫码系统',
    layout: 'mix',
    fixedHeader: true,
    fixSiderbar: true,
    contentWidth: 'Fluid',
  },
  history: {
    type: 'hash',
  },
  publicPath: './',
  routes: [
    { path: '/', redirect: '/orders' },
    { path: '/login', component: './login', layout: false },
    { path: '/inventory', name: '库存查看', component: './inventory/index' },
    { path: '/inventory/import', name: 'SKU 导入', component: './inventory/import' },
    { path: '/orders', name: '订单列表', component: './orders/index' },
    { path: '/orders/create', name: '创建订单', component: './orders/create' },
    { path: '/orders/detail/:id', name: '订单详情', component: './orders/detail', hideInMenu: true },
    { path: '/users', name: '用户管理', component: './users/index' },
  ],
  npmClient: 'npm',
});
