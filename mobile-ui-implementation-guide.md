# 📱 Mobile UI 优化 — 代码实施步骤方案

> **基于**：`mobile-ui-optimization-plan.md` v8/v9  
> **原则**：先配置 → 先样式 → 先模板 → 最后交互（每步可验证、可回退）  
> **日期**：2026-06-18

---

## 实施总览

```
阶段  范围        内容                                       文件数  风险
─────────────────────────────────────────────────────────────────────────
第1天  pages.json 导航栏·下拉刷新·键盘·TabBar 图标            1      🟢 低
       全局 CSS   user-select·tap-highlight·网络状态组件     2      🟢 低
       login      输入框·键盘·密码切换                       1      🟢 低
第2天  orders/index 卡片紧凑·状态色彩·空状态·搜索栏·下拉刷新  1      🟢 低
第3天  scan.vue   顶部栏·卡片·进度条·列表紧凑·底部两行        1      🟡 中
第4天  scan.vue   弹窗重构·视觉反馈·audio 单例               1      🟡 中
第5天  scan.vue   左滑删除（最高风险项）                     1      🔴 高
       create.vue 导航栏·滚动容器·校验反馈·删除确认          1      🟡 中
第6天  mine       信息行·退出确认                            1      🟢 低
       打包验证   全页面走查                                  —     🟢 低
```

---

## 第 1 天：基础设施 + 登录页（~4h）

### 步骤 1.1 — pages.json 全局配置

**文件**：`mobile/src/pages.json`

**改动**：

```json
{
  "pages": [
    {
      "path": "pages/orders/scan",
      "style": {
        "navigationBarTitleText": "扫码出库",
        "navigationStyle": "custom"           // ← 新增：隐藏原生导航栏
      }
    },
    {
      "path": "pages/orders/create",
      "style": {
        "navigationBarTitleText": "创建订单",
        "navigationStyle": "custom"           // ← 新增
      }
    },
    {
      "path": "pages/orders/index",
      "style": {
        "navigationBarTitleText": "订单",
        "enablePullDownRefresh": true         // ← 新增：下拉刷新
      }
    },
    {
      "path": "pages/login/index",
      "style": {
        "navigationBarTitleText": "登录",
        "app-plus": {                          // ← 新增：键盘适配
          "softinputMode": "adjustResize"
        }
      }
    }
    // mine/index 不改动
  ],
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/orders/index",
        "text": "订单",
        "iconPath": "/static/tab-order.png",           // ← 新增
        "selectedIconPath": "/static/tab-order-active.png"
      },
      {
        "pagePath": "pages/mine/index",
        "text": "我的",
        "iconPath": "/static/tab-mine.png",
        "selectedIconPath": "/static/tab-mine-active.png"
      }
    ]
  }
}
```

**验证**：重新编译运行，确认 scan/create 页原生导航栏消失，orders/index 可下拉，tabBar 显示图标（图标暂缺时会显示灰色方块）。

---

### 步骤 1.2 — 全局 CSS + 网络状态组件

#### 1.2a App.vue 全局触摸禁用

**文件**：`mobile/src/App.vue`

在 `<style>` 末尾追加：

```css
* {
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}
```

#### 1.2b 网络状态组件

**新建文件**：`mobile/src/components/NetworkBar.vue`

```html
<template>
  <view class="network-bar" :class="isOnline ? 'online' : 'offline'" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';

const isOnline = ref(true);
let handler: ((res: { isConnected: boolean }) => void) | null = null;

onMounted(() => {
  handler = (res) => { isOnline.value = res.isConnected; };
  uni.onNetworkStatusChange(handler);
});

onUnmounted(() => {
  if (handler) uni.offNetworkStatusChange(handler);
});
</script>

<style>
.network-bar { height: 4rpx; }
.network-bar.online  { background: #52c41a; }
.network-bar.offline { background: #e74c3c; }
</style>
```

#### 1.2c 在关键页面引入

**文件**：`mobile/src/pages/orders/scan.vue`、`mobile/src/pages/orders/index.vue`

```html
<!-- 模板第一行 -->
<template>
  <NetworkBar />
  <!-- 原有内容 ... -->
</template>

<script setup lang="ts">
import NetworkBar from '../../components/NetworkBar.vue';
// ... 原有 import ...
</script>
```

**验证**：编译运行，页面顶部出现 4rpx 绿色细线。断网后变红。

---

### 步骤 1.3 — 登录页样式优化

**文件**：`mobile/src/pages/login/index.vue`

#### 1.3a CSS 修改

| 选择器 | 属性 | 改前 | 改后 |
|--------|------|------|------|
| `.page` | `padding` | `72rpx 32rpx` | `48rpx 28rpx` |
| `.panel` | `padding` | `36rpx 28rpx` | `32rpx 28rpx` |
| `.label` | `font-size` | `26rpx` | `28rpx` |
| `.input` | `height` | `88rpx` | `96rpx` |
| `button[type="primary"]` | `height` | 默认 | `88rpx` |

#### 1.3b 密码明文切换

```html
<!-- 替换密码 .field -->
<view class="field">
  <text class="label">密码</text>
  <view class="input-wrap">
    <input v-model="form.password" class="input" :password="!showPassword" placeholder="请输入密码" />
    <text class="pw-toggle" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</text>
  </view>
</view>
```

```ts
// <script setup> 中新增
const showPassword = ref(false);
```

```css
.input-wrap { position: relative; }
.pw-toggle {
  position: absolute; right: 20rpx; top: 50%;
  transform: translateY(-50%);
  font-size: 26rpx; color: #1677ff; padding: 12rpx;
}
```

**验证**：点击"显示"/"隐藏"切换密码可见性。

---

## 第 2 天：订单列表页（~4h）

**文件**：`mobile/src/pages/orders/index.vue`

### 步骤 2.1 — CSS 紧凑化 + 状态色彩

| 选择器 | 属性 | 改前 | 改后 |
|--------|------|------|------|
| `.title` | `font-size` | `36rpx` | `34rpx` |
| `.hint` | `font-size` | `24rpx` | `26rpx` |
| `.add-btn` | `width`/`height` | `64rpx`/`56rpx` | `72rpx`/`64rpx` |
| `.order-card` | `padding` | `24rpx` | `20rpx` |
| `.order-card` | `margin-bottom` | `20rpx` | `14rpx` |
| `.order-no` | `font-size` | `30rpx` | `32rpx` |
| `.status` | `font-size` | `24rpx` | `26rpx` |
| `.meta-row` | `font-size` | `26rpx` | `28rpx` |
| `.plan-item` | `font-size` | `24rpx` | `26rpx` |

**状态色彩模板修改**：

```html
<!-- 改前 -->
<text class="status">{{ statusText[order.status] }}</text>

<!-- 改后 -->
<text class="status" :class="'status-' + order.status">{{ statusText[order.status] }}</text>
```

**状态色彩 CSS 新增**：

```css
.status-pending   { color: #fa8c16; }
.status-scanning  { color: #1677ff; }
.status-completed { color: #52c41a; }
.status-cancelled { color: #9ca3af; }
```

**左侧色条新增**：

```html
<view class="order-card" :style="{ borderLeftColor: statusColor[order.status] }">
```

```ts
const statusColor: Record<string, string> = {
  pending:   '#fa8c16',
  scanning:  '#1677ff',
  completed: '#52c41a',
  cancelled: '#9ca3af',
};
```

```css
.order-card {
  border-left: 3rpx solid transparent;
}
```

---

### 步骤 2.2 — 空状态 + 下拉刷新 + 搜索栏

#### 空状态

```html
<view v-if="orders.length === 0" class="empty">
  <text class="empty-icon">📦</text>
  <text class="empty-title">暂无订单</text>
  <text class="empty-hint">点击右上角「同步」获取订单</text>
</view>
```

#### 下拉刷新

```ts
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';

onPullDownRefresh(async () => {
  await handleSync();         // handleSync 内部已调用 loadOrders()（L77），无需重复
  uni.stopPullDownRefresh();
});
```

#### 搜索栏

```ts
const searchKeyword = ref('');

const filteredOrders = computed(() => {
  if (!searchKeyword.value) return orders.value;
  const kw = searchKeyword.value.toLowerCase();
  return orders.value.filter(o =>
    o.order_no.toLowerCase().includes(kw) ||
    o.vehicle_no.toLowerCase().includes(kw)
  );
});
```

```html
<!-- 在 header 下方、订单列表上方插入 -->
<view class="search-bar">
  <input v-model="searchKeyword" class="search-input" placeholder="搜索订单号或车牌号" />
</view>
```

```css
.search-bar { padding: 0 0 16rpx; }
.search-input {
  height: 64rpx; padding: 0 20rpx;
  border: 1px solid #d9dee8; border-radius: 8rpx;
  background: #ffffff; font-size: 26rpx;
}
```

> 将模板中 `v-for="order in orders"` 改为 `v-for="order in filteredOrders"`。

**验证**：不同状态卡片颜色不同；下拉刷新触发生效；搜索框可过滤。

---

## 第 3 天：扫码页 — 静态样式改造（~5h）

**文件**：`mobile/src/pages/orders/scan.vue`

> ⚠️ 第 3-5 天的改动集中在 scan.vue，建议每完成一步就 commit 或备份。

### 步骤 3.1 — 顶部栏安全区适配

**JS 新增**：

```ts
const statusBarHeight = ref(0);

// 在 onLoad 回调第一行增加：
statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0;
```

**模板修改**：

```html
<!-- 改前 -->
<view class="top-bar">

<!-- 改后 -->
<view class="top-bar" :style="{ paddingTop: (16 + statusBarHeight) + 'px' }">
```

**CSS 修改**：

| 选择器 | 属性 | 改前 | 改后 |
|--------|------|------|------|
| `.back-icon` | `font-size` | `36rpx` | `44rpx` |
| `.top-btn` | `height` | `56rpx` | `64rpx` |

**验证**：顶部栏不与状态栏重叠。

---

### 步骤 3.2 — 订单信息卡片 + 进度条

**CSS 修改**：

| 选择器 | 属性 | 改前 | 改后 |
|--------|------|------|------|
| `.card` | `padding` | `24rpx` | `20rpx 24rpx` |
| `.card-row` | `padding` | `10rpx 0` | `8rpx 0` |
| `.card-row` | `font-size` | `26rpx` | `30rpx` |
| `.label` | `color` | `#6b7280` | `#4b5563` |
| `.progress-bar` | `height` | `8rpx` | `12rpx` |
| `.progress-bar` | `margin` | `0 24rpx 16rpx` | `0 24rpx 12rpx` |

**验证**：卡片更紧凑，进度条更粗。

---

### 步骤 3.3 — 扫码列表紧凑化

**CSS 修改**：

| 选择器 | 属性 | 改前 | 改后 |
|--------|------|------|------|
| `.scan-item` | `padding` | `18rpx 20rpx` | `12rpx 16rpx` |
| `.scan-item` | `margin-bottom` | `12rpx` | `8rpx` |
| `.scan-item` | `border-left` | `6rpx solid #1677ff` | `8rpx solid #1677ff` |
| `.scan-code` | `font-size` | `28rpx` | `30rpx` |
| `.scan-meta` | `font-size` | `22rpx` | `24rpx` |

**验证**：列表条目更紧凑，字体更大。

---

### 步骤 3.4 — 底部操作区两行布局

**模板重构**（替换现有 `.bottom-bar`）：

```html
<view class="bottom-bar">
  <input class="barcode-input" type="text" v-model="barcode"
    @confirm="onBarcodeConfirm" :focus="inputFocus"
    :confirm-hold="true" confirm-type="done"
    placeholder="扫描或输入条码" />
  <view class="bottom-btns">
    <button class="btn-confirm" size="mini" @click="onBarcodeConfirm()">确定</button>
    <button class="btn-camera" size="mini" @click="openCamera">扫码</button>
  </view>
</view>
```

**CSS 替换**：

```css
.bottom-bar {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: 12rpx 24rpx 24rpx;
  background: #ffffff;
  border-top: 1px solid #eef0f4;
}
.barcode-input {
  height: 88rpx;
  padding: 0 20rpx;
  border: 1px solid #d9dee8;
  border-radius: 8rpx;
  background: #f6f7f9;
  font-size: 32rpx;
}
.bottom-btns {
  display: flex;
  gap: 12rpx;
}
.btn-confirm, .btn-camera {
  flex: 1;
  margin: 0;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 8rpx;
  font-size: 30rpx;
  text-align: center;
}
.btn-confirm { background: #1677ff; color: #ffffff; }
.btn-camera  { background: #f0f2f5; color: #1f2329; }
```

**JS 新增 — 键盘回退**：

```ts
const keyboardHeight = ref(0);
const isTwoRowMode = computed(() => keyboardHeight.value === 0);

onLoad(() => {
  // ... 原有逻辑 ...
  uni.onKeyboardHeightChange((res) => { keyboardHeight.value = res.height; });
});

onUnload(() => {
  uni.offKeyboardHeightChange();
});
```

```html
<!-- 模板中的 .bottom-bar 改为 -->
<view class="bottom-bar" :class="{ 'bottom-bar-row': !isTwoRowMode }">
```

```css
/* 键盘弹出时回退到单行 */
.bottom-bar-row { flex-direction: row; gap: 12rpx; }
.bottom-bar-row .barcode-input { height: 76rpx; font-size: 28rpx; }
.bottom-bar-row .btn-confirm,
.bottom-bar-row .btn-camera { flex: 1; height: 76rpx; font-size: 26rpx; }
```

**验证**：底部栏变为两行；切换到单行模式时键盘高度变化触发。

---

### 步骤 3.5 — 提交按钮防重复

**模板**：

```html
<button class="top-btn submit-btn" size="mini" type="primary"
  :disabled="submitting" :loading="submitting"
  @click="handleSubmit">提交</button>
```

**JS**：

```ts
const submitting = ref(false);

// 在 handleSubmit 函数中，所有 early return 之后、showModal 之前：
submitting.value = true;
try {
  // ... 原有逻辑不变 ...
} finally {
  submitting.value = false;
}
```

**验证**：点击"提交"后按钮变灰 + loading 动画，提交完成后恢复。

---

### 步骤 3.6 — playFeedback 音频单例

```ts
// 替换原有 playFeedback 函数
let feedbackAudio: ReturnType<typeof uni.createInnerAudioContext> | null = null;

function playFeedback(type: 'success' | 'failure'): void {
  if (!feedbackAudio) {
    feedbackAudio = uni.createInnerAudioContext();
    feedbackAudio.onEnded(() => { /* 复用 */ });
    feedbackAudio.onError(() => {
      feedbackAudio?.destroy();
      feedbackAudio = null; // 下次自动重建
    });
  }
  feedbackAudio.stop();
  feedbackAudio.src = type === 'success' ? '/static/pass.wav' : '/static/fail.wav';
  feedbackAudio.play();
}
```

**验证**：连续快速扫码，声音正常播放无卡顿。

---

## 第 4 天：扫码页 — 弹窗重构 + 视觉反馈（~4h）

### 步骤 4.1 — 汇总弹窗重构

**模板**（替换现有弹窗）：

```html
<view v-if="showSummary" class="overlay" @click="showSummary = false" @touchmove.stop.prevent>
  <view class="popup" @click.stop>
    <view class="popup-header">
      <text class="popup-title">汇总统计</text>
      <!-- 移除右上角 × -->
    </view>
    <view class="popup-body">
      <!-- 原有内容不变 -->
    </view>
    <view class="popup-close-btn" @click="showSummary = false">关闭</view>
  </view>
</view>
```

**CSS 替换**：

```css
.overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.popup {
  display: flex;
  flex-direction: column;
  width: 680rpx;
  max-height: 85vh;
  border-radius: 16rpx;
  background: #ffffff;
}
.popup-header {
  flex-shrink: 0;
  display: flex; justify-content: space-between; align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1px solid #eef0f4;
  border-radius: 16rpx 16rpx 0 0;
}
.popup-title { font-size: 32rpx; font-weight: 700; color: #1f2329; }
.popup-body {
  flex: 1;
  min-height: 0;
  padding: 24rpx 32rpx 32rpx;
  overflow-y: auto;
  font-size: 28rpx;
}
.popup-close-btn {
  flex-shrink: 0;
  height: 80rpx; line-height: 80rpx;
  background: #f0f2f5; color: #1f2329;
  font-size: 30rpx; font-weight: 600; text-align: center;
  border-radius: 0 0 16rpx 16rpx;
}
.summary-row { display: flex; justify-content: space-between; padding: 12rpx 0; font-size: 28rpx; color: #1f2329; }
.divider { height: 1px; margin: 16rpx 0; background: #eef0f4; }
.product-stat { padding: 16rpx 0; border-bottom: 1px solid #f6f7f9; }
.ps-code { display: block; font-size: 28rpx; color: #1f2329; font-weight: 600; }
.ps-qty { display: block; margin-top: 4rpx; font-size: 26rpx; color: #6b7280; }
.ps-diff { display: block; margin-top: 2rpx; font-size: 26rpx; }
```

**验证**：点击"汇总"→ 弹窗显示，关闭按钮在底部始终可见，点击遮罩也可关闭。

---

### 步骤 4.2 — 扫码视觉反馈

```ts
const inputError = ref(false);
```

在 `onBarcodeConfirm` 的 catch 块末尾增加（`focusScannerInput()` **之后**）：

```ts
inputError.value = true;
setTimeout(() => { inputError.value = false; }, 300);
```

**模板**：

```html
<input :class="{ 'barcode-input': true, 'input-error': inputError }" ... />
```

```css
.input-error {
  border-color: #e74c3c !important;
  transition: border-color 0.15s ease;
}
```

**验证**：扫码失败时输入框边框短暂变红，条码保留在输入框中。

---

## 第 5 天：扫码页 — 左滑删除（~6h）

> 🔴 最高风险步骤。建议先单独在一个测试页中实现手势逻辑，验证通过后再集成到 scan.vue。

### 步骤 5.1 — active/deleted 分离

```ts
const activeScanItems = computed(() =>
  scanItems.value.filter(it => it.status === 'active')
);
const deletedScanItems = computed(() =>
  scanItems.value.filter(it => it.status === 'deleted')
);
```

---

### 步骤 5.2 — 手势数据 + 响应式触发器

```ts
const screenWidth = uni.getSystemInfoSync().screenWidth;
const rpx2px = (v: number) => v * (screenWidth / 750);
const DELETE_WIDTH = rpx2px(120);   // px
const SNAP_THRESHOLD = rpx2px(50);  // px

const swipeState = { startX: 0, currentId: '' as string };
const swipeOffset: Record<string, number> = {};
const swipeVersion = ref(0);
const scanItemEls = ref<Record<string, { contentEl: HTMLElement }>>({});

function swipePx(id: string): number {
  return Math.round(swipeOffset[id] || 0);
}

function getScanItemEl(id: string): HTMLElement | null {
  return scanItemEls.value[id]?.contentEl || null;
}
```

---

### 步骤 5.3 — 手势回调

```ts
function onSwipeStart(e: TouchEvent, id: string): void {
  swipeState.startX = e.touches[0].clientX;
  swipeState.currentId = id;
  Object.keys(swipeOffset).forEach(key => {
    if (key !== id && swipeOffset[key] !== 0) swipeOffset[key] = 0;
  });
  swipeVersion.value++;
}

function onSwipeMove(e: TouchEvent, id: string): void {
  if (id !== swipeState.currentId) return;
  const deltaX = e.touches[0].clientX - swipeState.startX;
  if (deltaX > 0) return;
  const offset = Math.max(-DELETE_WIDTH, deltaX);
  swipeOffset[id] = offset;
  const el = getScanItemEl(id);
  if (el) el.style.transform = `translateX(${Math.round(offset)}px)`;
}

function onSwipeEnd(_e: TouchEvent, id: string): void {
  if (id !== swipeState.currentId) return;
  swipeOffset[id] = Math.abs(swipeOffset[id]) > SNAP_THRESHOLD ? -DELETE_WIDTH : 0;
  swipeState.currentId = '';
  swipeVersion.value++;
}
```

---

### 步骤 5.4 — 模板替换

```html
<!-- 替换现有 v-for 区块 -->
<scroll-view class="scan-list" :style="{ height: scanListHeight }" scroll-y>
  <view v-if="scanItems.length === 0" class="empty-hint">
    <text>等待扫码…</text>
  </view>

  <!-- active 条目：支持左滑 -->
  <view class="scan-item" v-for="item in activeScanItems" :key="item.client_item_id"
    :ref="(el: any) => { if (el) scanItemEls.value[item.client_item_id] = el; }">
    <view class="swipe-delete-btn" @click.stop="handleDeleteItem(item)">删除</view>
    <view class="scan-item-content"
      @touchstart="onSwipeStart($event, item.client_item_id)"
      @touchmove="onSwipeMove($event, item.client_item_id)"
      @touchend="onSwipeEnd($event, item.client_item_id)"
      :style="{ transform: 'translateX(' + swipePx(item.client_item_id) + 'px)' }">
      <view class="scan-item-left">
        <text class="scan-code">{{ item.product_code }} · {{ item.roll_code }}</text>
        <text class="scan-meta">{{ item.model }} | {{ Number(item.weight).toFixed(3) }} kg</text>
        <text class="scan-meta">#{{ item.scan_seq }} · {{ item.scanned_at }}</text>
      </view>
    </view>
    <text style="display:none">{{ swipeVersion }}</text>
  </view>

  <!-- deleted 条目：折叠态 -->
  <view class="scan-item deleted-item" v-for="item in deletedScanItems" :key="item.client_item_id">
    <text class="deleted-label">已删除 — {{ item.product_code }} · {{ item.roll_code }}</text>
  </view>
</scroll-view>
```

---

### 步骤 5.5 — CSS 追加

```css
.scan-item { position: relative; overflow: hidden; }
.swipe-delete-btn {
  position: absolute; right: 0; top: 0; bottom: 0;
  width: 120rpx;
  background: #e74c3c; color: #ffffff;
  font-size: 28rpx; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
}
.scan-item-content {
  position: relative; z-index: 1;
  background: #ffffff;
  transition: transform 0.2s ease;
}
.deleted-item {
  height: 44rpx; padding: 0 20rpx;
  background: #f9fafb;
  border-left: 6rpx solid #d1d5db;
  opacity: 0.6;
}
.deleted-label { font-size: 22rpx; color: #9ca3af; }
```

**验证**：左滑条目露出红色删除按钮，点击删除后条目移至底部折叠态。

---

### 步骤 5.6 — scroll-view 高度测量

```ts
const scanListHeight = ref('100vh');

// 在 initPage() 末尾（loadInventoryCache 之后）插入：
nextTick(() => {
  const query = uni.createSelectorQuery();
  query.select('.top-bar').boundingClientRect();
  query.select('.card').boundingClientRect();
  query.select('.progress-bar').boundingClientRect();
  query.select('.bottom-bar').boundingClientRect();
  query.exec((results) => {
    const totalFixed = results.reduce((sum, r) => sum + ((r as any)?.height || 0), 0);
    scanListHeight.value = `calc(100vh - ${totalFixed}px)`;
  });
});
```

> 将 `scroll-view` 的 `:style="{ height: scanListHeight }"` 绑定。

---

## 第 6 天：创建订单页 + 我的页 + 打包验证（~5h）

### 步骤 6.1 — create.vue 双重导航栏 + 安全区

同 scan.vue 步骤 3.1：`statusBarHeight` ref + `:style` 绑定 + CSS。

---

### 步骤 6.2 — create.vue 长表单滚动容器

**模板**：

```html
<view class="page">
  <view class="top-bar" :style="{ paddingTop: (16 + statusBarHeight) + 'px' }">
    <text class="back-icon" @click="goBack">←</text>
    <text class="top-title">创建订单</text>
    <text></text>
  </view>
  <scroll-view class="form-scroll" scroll-y>
    <!-- 原有 .form-card 和 .add-plan -->
  </scroll-view>
  <view class="submit-area">
    <button type="primary" :loading="submitting" @click="handleSubmit">保存订单</button>
  </view>
</view>
```

**CSS**：

```css
.page {
  display: flex; flex-direction: column;
  height: 100vh;
  background: #f6f7f9;
}
.form-scroll {
  flex: 1; min-height: 0;
  padding: 24rpx;
  overflow-y: auto;
}
.submit-area {
  flex-shrink: 0;
  padding: 16rpx 24rpx 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom, 0px));
  background: #ffffff;
  border-top: 1px solid #eef0f4;
}
```

---

### 步骤 6.3 — create.vue 字段校验 + removePlan 确认

**JS 新增**：

```ts
const fieldErrors = reactive<Record<string, string>>({});
```

在 `handleSubmit` 校验失败处增加 `fieldErrors` 赋值（原有 `uni.showToast` 保留）。

**模板**：

```html
<input :class="{ input: true, 'input-error': fieldErrors.vehicleNo }"
  @input="delete fieldErrors.vehicleNo" />
<input :class="{ input: true, 'input-error': fieldErrors['plan_' + index + '_code'] }"
  @input="delete fieldErrors['plan_' + index + '_code']" />
```

**removePlan**：

```ts
function removePlan(index: number): void {
  if (form.plans.length <= 1) return;
  uni.showModal({
    title: '确认删除',
    content: `确定删除产品明细 ${index + 1}？`,
    success: (res) => {
      if (!res.confirm) return;
      // 清理 fieldErrors + 重排 key（参见方案文档 §4.25）
      delete fieldErrors[`plan_${index}_code`];
      delete fieldErrors[`plan_${index}_qty`];
      for (let i = index + 1; i < form.plans.length; i++) {
        ['code', 'qty'].forEach(field => {
          const oldKey = `plan_${i}_${field}`;
          if (fieldErrors[oldKey]) {
            fieldErrors[`plan_${i - 1}_${field}`] = fieldErrors[oldKey];
            delete fieldErrors[oldKey];
          }
        });
      }
      form.plans.splice(index, 1);
    },
  });
}
```

---

### 步骤 6.4 — mine/index.vue

**CSS 修改**：

| 选择器 | 属性 | 改前 | 改后 |
|--------|------|------|------|
| `.row` | `padding` | `16rpx 0` | `20rpx 0` |
| `.row` | `font-size` | `26rpx` | `28rpx` |
| `.label` | `color` | `#6b7280` | `#4b5563` |
| `.panel` | `padding` | `24rpx` | `28rpx 24rpx` |
| `button[type="primary"]` | `height` | 默认 | `88rpx` |
| `.logout` | — | 默认 | `background: #fff1f0; border-color: #e74c3c; color: #e74c3c` |

**退出确认**：

```ts
function handleLogout(): void {
  uni.showModal({
    title: '确认退出',
    content: '退出后需重新登录。',
    success: (res) => {
      if (res.confirm) {
        clearSession();
        uni.reLaunch({ url: '/pages/login/index' });
      }
    },
  });
}
```

---

### 步骤 6.5 — TabBar 图标制作

手动制作 4 枚 81×81px PNG 图标放入 `mobile/src/static/`：

| 文件 | 用途 | 颜色 |
|------|------|------|
| `tab-order.png` | 订单-未选中 | 灰色 `#999` |
| `tab-order-active.png` | 订单-选中 | 蓝色 `#1677ff` |
| `tab-mine.png` | 我的-未选中 | 灰色 `#999` |
| `tab-mine-active.png` | 我的-选中 | 蓝色 `#1677ff` |

---

### 步骤 6.6 — 打包验证

```bash
# HBuilderX 中：发行 → 原生 App-本地打包 → 生成本地打包 App 资源
# 将 dist 目录导入 Android Studio 打包为 APK
```

**验证清单**：

| 页面 | 验证点 |
|------|--------|
| 登录 | 输入框增大、密码切换、键盘弹起后面板不遮挡 |
| 订单列表 | 状态四色、下拉刷新、搜索过滤、tabBar 图标 |
| 扫码出库 | 双导航栏消失、顶部安全区、底部两行布局、列表紧凑、左滑删除、弹窗关闭按钮、提交防重复、扫码声音/视觉反馈 |
| 创建订单 | 长表单滚动、校验红框、删除确认 |
| 我的 | 信息行、退出确认 |

---

## 附录：回退策略

| 风险等级 | 步骤 | 回退方式 |
|:---:|------|---------|
| 🟢 | pages.json 配置 | 还原 JSON 节点 |
| 🟢 | CSS 修改 | `git checkout -- mobile/src/pages/xxx/index.vue` |
| 🟡 | 模板重构（底部栏/弹窗） | 保留原代码注释，验证通过后删除 |
| 🔴 | 左滑删除 | 先独立测试页验证，确认后合入；保留原 `@click` 删除代码注释 |

---

> 每完成一个步骤立即打包到 PDA 验证，不要积压到最后一天集中测试。
