# 腈纶出库扫码系统 — 项目基础信息

本文档供 AI / 新开发者快速了解项目的代码仓库、服务器信息与部署方式。

---

## 一、GitHub 仓库

| 项目 | 地址 |
|------|------|
| 总仓库 (Monorepo) | `git@github.com:1131657662/acrylic-outbound-system.git` |
| 仓库所有者 | `1131657662` |
| 主分支 | `master` |

本项目是一个 Monorepo，包含三个子项目：

| 目录 | 说明 | 技术栈 |
|------|------|--------|
| `server/` | 后端 API | Egg.js 3.x + MySQL 8.0 + JWT |
| `admin/` | PC 后台前端 | Ant Design Pro v6 + Umi 4 + React 19 |
| `mobile/` | APP 端（扫码枪） | uni-app (Vue 3) |

---

## 二、Server（后端）详细信息

### 2.1 基本信息

| 项目 | 值 |
|------|-----|
| 包名 | `acrylic-outbound-server` |
| 框架 | Egg.js `^3.28.0` |
| 运行时要求 | Node.js >= 18.0.0 |
| 端口 | `7001` |
| 认证方式 | JWT (HS256)，有效期 12h |

### 2.2 目录结构

```
server/
├── app/
│   ├── router.js              # 路由定义（所有 API 注册在此）
│   ├── controller/            # 控制器层
│   │   ├── auth.js            # 登录认证
│   │   ├── inventory.js       # 库存管理
│   │   ├── orders.js          # 订单管理
│   │   ├── order_items.js     # 出库记录管理
│   │   └── users.js           # 用户管理
│   ├── service/               # 业务逻辑层
│   │   ├── auth.js
│   │   ├── inventory.js
│   │   ├── order_create.js    # 订单创建
│   │   ├── order_export.js    # Excel 导出
│   │   ├── order_items.js     # 出库记录
│   │   ├── order_local.js     # APP 本地订单同步
│   │   ├── order_query.js     # 订单查询
│   │   ├── order_submit.js    # 扫码提交
│   │   ├── order_workflow.js  # 订单工作流（取消/回退/锁定）
│   │   └── users.js
│   ├── middleware/
│   │   ├── auth.js            # JWT 鉴权中间件 + adminOnly
│   │   └── cors.js            # CORS 中间件
│   └── utils/
│       ├── order_no.js        # 订单号生成 (PO+年月日+4位流水)
│       ├── plan_stats.js      # 计划统计计算
│       ├── sku_parser.js      # SKU 文件解析
│       └── validators.js      # 参数校验
├── config/
│   ├── config.default.js      # Egg.js 主配置（JWT/MySQL/CORS）
│   └── plugin.js              # 插件配置（egg-mysql）
├── database/
│   └── schema.sql             # 数据库建表 SQL（6 张表）
├── .env                       # 环境变量（实际使用）
├── .env.example               # 环境变量模板
└── package.json
```

### 2.3 数据库配置

数据库：**MySQL 8.0**

| 配置项 | 值（生产） |
|--------|-----------|
| 数据库名 | `acrylic_scan` |
| 字符集 | `utf8mb4` |
| 用户名 | `acrylic_app` |
| 密码 | `123123` |
| 主机 | `127.0.0.1`（本机部署） |
| 端口 | `3306` |

配置方式：`server/.env` 环境变量（JWT_SECRET / DB_HOST / DB_PORT / DB_USER / DB_PASSWORD / DB_NAME / CORS_ORIGIN）。

### 2.4 数据库表（6 张）

| 表名 | 说明 |
|------|------|
| `users` | 用户表（username/password/role: admin\|operator） |
| `inventory` | 库存表（roll_code/model/weight/product_code/status） |
| `sku_import_batches` | SKU 导入批次日志 |
| `orders` | 订单主表（order_no/customer/vehicle_no/status/lock） |
| `order_plans` | 订单计划明细（product_code/model/planned_qty） |
| `order_items` | 出库记录表（client_item_id/roll_code/scan_seq/status） |

### 2.5 API 接口清单

所有接口（除登录外）需 Header: `Authorization: Bearer <token>`

| 方法 | 路径 | 说明 | 权限 |
|------|------|------|------|
| POST | `/api/auth/login` | 用户登录，返回 JWT | 公开 |
| POST | `/api/inventory/import` | 导入 SKU 文件 | 管理员 |
| GET | `/api/inventory/sync` | 全量可用库存同步 | 登录 |
| GET | `/api/inventory` | 库存列表查询 | 登录 |
| GET | `/api/orders` | 订单列表 | 登录 |
| GET | `/api/orders/pending` | 待处理订单列表 | 登录 |
| GET | `/api/orders/:id` | 订单详情 | 登录 |
| POST | `/api/orders/create` | 创建订单 | 登录 |
| POST | `/api/orders/local-sync` | APP 上传本地订单 | 登录 |
| POST | `/api/orders/submit` | 批量提交扫码记录 | 登录 |
| POST | `/api/orders/:id/cancel` | 取消订单 | 管理员 |
| POST | `/api/orders/:id/revert` | 回退已完成订单 | 管理员 |
| POST | `/api/orders/:id/lock` | 锁定订单扫码 | 登录 |
| POST | `/api/orders/:id/unlock` | 释放订单锁 | 登录 |
| GET | `/api/orders/:id/export` | 导出 Excel | 登录 |
| POST | `/api/order-items/:id/delete` | 删除出库记录 | 管理员 |
| GET | `/api/users` | 用户列表 | 管理员 |
| POST | `/api/users` | 创建用户 | 管理员 |
| POST | `/api/users/:id/reset-password` | 重置密码 | 管理员 |

### 2.6 CORS 配置

允许的来源白名单：
- `http://127.0.0.1:8000`
- `http://localhost:8000`
- 通过 `CORS_ORIGIN` 环境变量可追加

### 2.7 启动方式

```bash
cd server
npm install
npm run dev          # 开发模式（egg-bin dev，端口 7001）
npm start            # 生产模式（egg-scripts start --daemon --title=acrylic-outbound-server）
npm stop             # 停止生产服务
```

---

## 三、Admin（PC 后台）详细信息

### 3.1 基本信息

| 项目 | 值 |
|------|-----|
| 包名 | `acrylic-outbound-admin` |
| 框架 | Ant Design Pro v6 + Umi 4 (`@umijs/max`) |
| React 版本 | React 19 |
| 端口 | `8000`（开发/生产） |
| 路由模式 | Hash 路由 (`history.type: 'hash'`) |
| 构建输出 | `admin/dist/` |
| publicPath | `./`（相对路径，适配云部署子路径） |

### 3.2 目录结构

```
admin/
├── config/
│   └── config.ts              # Umi 配置（路由/布局/history/publicPath）
├── src/
│   ├── app.tsx                # 全局布局配置 + 用户菜单
│   ├── pages/                 # 页面
│   │   ├── login.tsx          # 登录页
│   │   ├── inventory/
│   │   │   └── import.tsx     # SKU 导入页
│   │   ├── orders/
│   │   │   ├── index.tsx      # 订单列表页
│   │   │   ├── create.tsx     # 订单创建页
│   │   │   ├── detail.tsx     # 订单详情页
│   │   │   ├── hooks/
│   │   │   │   └── useOrderDetail.ts
│   │   │   └── components/
│   │   │       ├── OrderPlanTable.tsx
│   │   │       ├── OrderItemTable.tsx
│   │   │       ├── OrderSummary.tsx
│   │   │       └── ExportOrderButton.tsx
│   │   └── users/
│   │       ├── index.tsx      # 用户管理
│   │       └── create.tsx     # 创建用户
│   └── services/
│       ├── api.ts             # 统一请求封装（fetch + JWT）
│       ├── auth.ts            # 认证服务
│       ├── inventory.ts       # 库存接口
│       ├── orders.ts          # 订单接口
│       ├── users.ts           # 用户接口
│       └── types.ts           # 类型定义
├── scripts/
│   └── serve-dist.js          # 生产静态文件服务器
├── dist/                      # 构建产物
├── .env                       # 环境变量
├── tsconfig.json
└── package.json
```

### 3.3 页面路由

| 路径 | 页面 | 菜单可见 |
|------|------|----------|
| `/login` | 登录页 | 隐藏 |
| `/` | → 重定向到 `/orders` | - |
| `/inventory/import` | SKU 导入 | 是 |
| `/orders` | 订单列表 | 是 |
| `/orders/create` | 创建订单 | 是 |
| `/orders/detail/:id` | 订单详情 | 隐藏（菜单不显示） |

### 3.4 API 连接配置

`admin/src/services/api.ts` 中定义：
```ts
export const API_BASE = process.env.UMI_APP_API_BASE || 'http://114.67.203.242/acrylic/api';
```

开发时在 `admin/.env` 中设置：
```
UMI_APP_API_BASE=http://localhost:7001/api
```

### 3.5 启动方式

```bash
cd admin
npm install
npm run dev      # 开发模式（Umi dev server，端口 8000）
npm run build    # 构建（输出到 dist/）
npm run serve    # 生产静态服务（node scripts/serve-dist.js，端口 8000）
```

---

## 四、服务器与部署信息

### 4.1 云服务器

| 项目 | 值 |
|------|-----|
| 服务器 IP | `114.67.203.242` |
| 服务器登录账号/密码 | root/LiBin1131657662 |
| 操作系统 | Linux |
| 数据库 | MySQL 8.0（本机 127.0.0.1:3306） |

### 4.2 部署架构

```
用户浏览器/APP
    │
    ▼
nginx (114.67.203.242:80)
    │
    ├── /acrylic/            → admin/dist/ (静态文件)
    │                          * SPA fallback: 所有子路径 → index.html
    │
    └── /acrylic/api/*       → proxy_pass http://127.0.0.1:7001/api/*
                                (Egg.js 后端)
```

**关键说明：**
- Nginx 作为统一入口，`/acrylic` 路径下托管 Admin 前端静态文件
- `/acrylic/api` 反向代理到本机 Egg.js 7001 端口
- `publicPath: './'` + `history.type: 'hash'` 确保 Admin 在子路径下正常工作
- APP 端默认 API 地址：`http://114.67.203.242/acrylic/api`

### 4.3 后端部署

```bash
# 在服务器上
cd /path/to/acrylic-outbound-system/server
cp .env.example .env
# 编辑 .env 填入实际配置

npm install
npm start    # egg-scripts start --daemon --title=acrylic-outbound-server
```

管理命令：
```bash
npm start           # 启动守护进程
npm stop            # 停止
NODE_ENV=production npm start   # 生产模式启动
```

### 4.4 Admin 前端部署

```bash
# 构建
cd admin
npm install
npm run build    # 输出到 dist/

# dist/ 目录文件直接部署到 nginx 的 /acrylic 路径下
```

---

## 五、核心依赖

### Server

| 包 | 用途 |
|----|------|
| `egg` ^3.28.0 | Web 框架 |
| `egg-mysql` ^4.0.0 | MySQL 数据库插件 |
| `jsonwebtoken` ^9.0.2 | JWT 认证 |
| `bcryptjs` ^2.4.3 | 密码加密 |
| `exceljs` ^4.4.0 | Excel 文件生成 |
| `egg-scripts` ^2.17.0 | 生产进程管理 |

### Admin

| 包 | 用途 |
|----|------|
| `@umijs/max` ^4.4.0 | Umi 框架（内置路由/状态管理/请求） |
| `@ant-design/pro-components` ^2.8.0 | ProTable 等高级组件 |
| `antd` ^5.26.0 | UI 组件库 |
| `react` ^19.0.0 | 前端框架 |

---

## 六、关键注意事项

1. **扫码枪硬件**：摩尔通信 NA60，需开启「模拟键盘输入 + 自动追加回车后缀」
2. **订单号规则**：`PO+年月日+4位流水`（例：`PO202606120001`）
3. **单设备扫码**：同一订单同一时间仅允许一台设备扫码（通过订单锁机制）
4. **离线优先**：APP 所有核心操作在本地 Storage 完成，仅同步/提交需联网
5. **出库记录冗余**：`order_items` 必须保存型号、产品代码、重量，导出不依赖当前库存
6. **SKU 导入规则**：全量快照重建库存，已出库卷号跳过
7. **APK 打包**：使用 DCloud 离线打包 SDK 5.07，需 HBuilderX（非 CLI）
