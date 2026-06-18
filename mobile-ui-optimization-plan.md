# 📱 Mobile UI 优化方案 v8（适配 480×800 设备）

> **项目**：腈纶出库扫码系统 — uni-app (Vue 3) 移动端  
> **目标设备**：480×800 手持 PDA 扫码枪（模拟键盘输入 + 触摸操作）  
> **审查范围**：样式 · 布局 · 触控 · 性能 · 边界状态 · 交互防护 · 实施细节  
> **硬约束**：仅修改 UI/布局/交互外壳，不更改原有业务逻辑  
> **方案日期**：2026-06-18  
> **版本**：v8（整合第三轮审查：修正 3 处残留 + 2 处可选改进）  
> **状态**：待实施

---

## 一、设备与场景分析

| 维度 | 细节 | 影响 |
|------|------|------|
| 分辨率 | 480×800 物理像素 | 屏幕"矮胖"，垂直空间紧俏，宽高比 3:5 |
| 输入方式 | PDA 扫码枪模拟键盘输入 + 回车；偶有手动输入 | 条码走 `@confirm` 事件；手动输入依赖触摸键盘 |
| 扫码速度 | 连续扫码间隔快至 **0.5 秒** | 每次扫码触发 `scanItems.push` → Vue diff → 列表重绘，低端 CPU 可能丢帧 |
| 触控方式 | 手指 / 电阻屏触笔 | **小触控目标难以精准点击** |
| 光照环境 | 仓库（偏暗 / 强光） | 需高对比度、较大字号 |
| 网络环境 | 仓库 Wi-Fi 不稳定 | 离线场景常见，需明确状态反馈 |
| **Android 版本** | PDA 可能搭载 Android 5-7 | Emoji 字体不全，WebView 兼容性需关注 |

---

## 二、现有页面概况

```
mobile/src/pages/
├── login/index.vue      登录页 — 居中表单面板
├── orders/index.vue     订单列表（tabBar 页）— 卡片列表 + 同步/新建
├── orders/scan.vue      扫码出库（核心高频页）— 信息卡 + 进度条 + 扫码列表 + 底部输入栏 + 汇总弹窗
├── orders/create.vue    创建订单 — 表单 + 多产品明细
└── mine/index.vue       我的（tabBar 页）— 用户信息 + 同步/退出
```

---

## 三、问题诊断总览

```
 页面               样式/布局问题            结构/交互/性能问题              优先级
────────────────────────────────────────────────────────────────────────────────
scan.vue        触控目标偏小              ❶ 双重导航栏浪费垂直空间        🔴 P0
(扫码出库)       进度条太细                ❷ 删除按钮 36rpx 无法点击
                弹窗尺寸未充分利用         ❸ 汇总弹窗关闭 × 无法点击
                底部输入栏单行拥挤         ❹ 0.5s 快速扫码列表渲染性能
                已删除条目混排             ❺ 弹窗滚动边界不足
                                          ❻ 弹窗滚动穿透遮罩
                                          ❼ 提交按钮无防重复点击保护
                                          ⓸ playFeedback 高频创建 audio 泄漏

orders/index    卡片文字拥挤              ❽ 无下拉刷新                     🟡 P1
(订单列表)       空状态简陋                ❾ 无搜索/筛选
                状态颜色语义弱             ❿ 缺少左侧色条
                                          ⓫ TabBar 无图标

login/index     输入框高度不足            ⓬ 密码无明文切换                  🟢 P2
(登录)           未处理键盘弹起

create          产品明细过密              ⓭ 双重导航栏（同 scan.vue）      🟢 P2
(创建订单)       按钮偏小                  ⓮ 表单无字段级校验反馈
                表单间距紧凑              ⓯ removePlan 无确认
                                          ⓰ 长表单无滚动容器

mine/index      信息行间距紧凑            ⓱ 退出登录无确认                  🟢 P3
(我的)           按钮不够醒目

全局            —                        ⓲ 无网络状态指示                  🟡 P1
```

> **合计 32 个修改点**（19 个结构/交互/性能 + 13 个样式），全部限定在 UI/布局/交互外壳层面。

---

## 四、逐页优化方案

---

### 🔴 P0 — `scan.vue`（扫码出库页，核心高频页）

#### 4.1 结构修复：消除双重导航栏 ❶

**问题**：`pages.json` 的原生导航栏 + 模板自定义 `top-bar` 叠加。

**实际情况**：原生导航栏实际占用 = `statusBarHeight`（Android 约 24-30px）+ `titleBar`（44px）= **68-74px**，加上自定义 top-bar（约 52rpx ≈ 33px）合计浪费约 **101-107px**。

```
┌─ 状态栏 ──────────────────────────────┐  ← 24-30px
├─ 原生标题栏（uni-app 自动）────────────┤  ← 44px
│  ← 扫码出库                          │
├─ 自定义 top-bar（模板手写）────────────┤  ← 约52rpx
│  ← 扫码出库          [汇总] [提交]   │
├──────────────────────────────────────┤
│  ...                                 │
```

**修复**：`pages.json` 中加 `"navigationStyle": "custom"`。

> 保留自定义 top-bar 的原因：右侧有"汇总""提交"两个高频按钮，原生导航栏无法承载。

---

#### 4.2 样式优化：顶部栏 `.top-bar` + 安全区适配

| 属性 | 当前 | 建议 | 说明 |
|------|------|------|------|
| `padding-top` | `16rpx` | 动态补偿 `statusBarHeight` | 消除原生导航栏后需自行适配 |
| `.back-icon` font-size | `36rpx` | `44rpx` | 增大返回箭头可点击区域 |
| `.top-btn` height | `56rpx` | `64rpx` | 增大汇总/提交按钮触控区 |

**安全区实现**：uni-app CSS 中不存在 `--status-bar-height` 变量，必须在 JS 中获取并通过 `:style` 绑定：

```ts
const statusBarHeight = ref(0);
onLoad(() => {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0;
});
```

```html
<view class="top-bar" :style="{ paddingTop: (16 + statusBarHeight) + 'px' }">
```

---

#### 4.3 交互防护：提交按钮防重复点击 ❼

**问题**：`handleSubmit` 内 `uni.showModal` 异步确认期间可重复点击。

**修复**：新增 `submitting` ref：

```html
<button :disabled="submitting" :loading="submitting" @click="handleSubmit">提交</button>
```

```ts
const submitting = ref(false);

async function handleSubmit(): Promise<void> {
  // 原有校验逻辑（不含 submitting 赋值）...
  // 注意：early return 之前不能设 submitting=true，否则按钮永久禁用

  // === 以下为包裹新增 ===
  submitting.value = true;
  try {
    // ... 原有提交逻辑完整保留（showModal → submitOrderItems → markScanItemsSynced）...
  } finally {
    submitting.value = false;
  }
}
```

> `submitting.value = true` 必须在所有 `return` 出口之后、`showModal` 之前赋值。

---

#### 4.4 样式优化：订单信息卡片 `.card`

| 属性 | 当前 | 建议 |
|------|------|------|
| `padding` | `24rpx` | `20rpx 24rpx` |
| `.card-row` padding | `10rpx 0` | `8rpx 0` |
| `.card-row` font-size | `26rpx` | `30rpx` |
| `.label` color | `#6b7280` | `#4b5563` |

#### 4.5 样式优化：进度条 `.progress-bar`

| 属性 | 当前 | 建议 |
|------|------|------|
| `height` | `8rpx` | `12rpx` |
| `margin` | `0 24rpx 16rpx` | `0 24rpx 12rpx` |

---

#### 4.6 交互重构：左滑删除 ❷（替代 × 按钮）

**当前问题**：删除按钮 `<text class="delete-btn">×</text>` 仅 36rpx（约23px），不可精准点击。

**方案**：左滑露出 120rpx 红色"删除"按钮 → 点击确认。

**DOM 结构（active + deleted 分离渲染）：**

```html
<!-- active 条目：支持左滑 -->
<view class="scan-item" v-for="item in activeScanItems" :key="item.client_item_id">
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

<!-- deleted 条目：折叠态，不参与手势 -->
<view class="scan-item deleted-item" v-for="item in deletedScanItems" :key="item.client_item_id">
  <text class="deleted-label">已删除 — {{ item.product_code }} · {{ item.roll_code }}</text>
</view>
```

**手势参数：**

| 参数 | 值 | 说明 |
|------|------|------|
| 触发方向 | 仅左滑（deltaX < 0） | 右滑忽略 |
| 吸附阈值 | `deltaX < -50px`（逻辑 px） | 超过→吸附到 -120px；未超过→归零 |
| 删除按钮宽度 | `120px`（逻辑 px） | 宽大 |
| 动画 | `transition: transform 0.2s ease` | CSS 在 class 上 |
| 互斥 | 滑动新条目时归零所有旧条目 | 只有一条处于展开态 |
| 清理 | `handleDeleteItem` 后 `delete swipeOffset[id]` | 防止泄漏 |

**手势 JS 实现（含 rpx→px 转换 + DOM 直接操作）：**

```ts
// ⚠️ uni-app 模板中 :style 的动态字符串不被编译器 rpx→px 处理。
// 必须手动转换：px = rpx * (screenWidth / 750)

const screenWidth = uni.getSystemInfoSync().screenWidth; // 逻辑 px 宽
const rpx2px = (v: number) => v * (screenWidth / 750);
const DELETE_WIDTH = rpx2px(120); // 删除按钮宽（px）
const SNAP_THRESHOLD = rpx2px(50); // 吸附阈值（px）

const swipeState = { startX: 0, currentId: '' as string };
const swipeOffset: Record<string, number> = {}; // 存储 px 值
const swipeVersion = ref(0);

function swipePx(id: string): number {
  return Math.round(swipeOffset[id] || 0);
}

// 模板 ref 收集 — 在 <script setup> 中定义：
const scanItemEls = ref<Record<string, { contentEl: HTMLElement }>>({});

// 模板中 v-for 添加 :ref 回调：
// <view class="scan-item" v-for="item in activeScanItems" :key="item.client_item_id"
//   :ref="(el: any) => { if (el) scanItemEls.value[item.client_item_id] = el; }">

function getScanItemEl(id: string): HTMLElement | null {
  return scanItemEls.value[id]?.contentEl || null;
}

function onSwipeStart(e: TouchEvent, id: string): void {
  swipeState.startX = e.touches[0].clientX;
  swipeState.currentId = id;
  // 互斥：归零其他展开项
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
  // 直接操作 DOM 样式，避免高频 ref 更新导致 Vue diff
  const el = getScanItemEl(id);
  if (el) el.style.transform = `translateX(${Math.round(offset)}px)`;
}

function onSwipeEnd(_e: TouchEvent, id: string): void {
  if (id !== swipeState.currentId) return;
  swipeOffset[id] = Math.abs(swipeOffset[id]) > SNAP_THRESHOLD ? -DELETE_WIDTH : 0;
  swipeState.currentId = '';
  swipeVersion.value++; // 触发最终渲染（CSS transition 完成吸附）
}
```

> `.scan-item-content` 的 `transform` 值改为 `swipePx(id)` 辅助函数（返回 px 值），避免模板中 `rpx` 拼接不被编译。

**样式：**

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
  background: #f9fafb; border-left: 6rpx solid #d1d5db; opacity: 0.6;
}
.deleted-label { font-size: 22rpx; color: #9ca3af; }
```

---

#### 4.7 列表性能优化：适配 0.5s 快速扫码 ❹

| 优化 | 做法 | 收益 |
|------|------|------|
| 分离 active/deleted 列表 | 两个 `computed` 分别渲染 | 减少无效 diff 节点 |
| 简化 DOM 嵌套 | 合并不必要的 `<view>` 层级 | diff 遍历节点数减少 |
| 固定列表高度 | `scroll-view` 用显式 `calc()` 替代 `flex: 1` | 避免每次重新测量布局 |
| 手势零响应式开销 | `swipeOffset` 普通对象 + 直接 DOM 操作 | 手势不污染 Vue 响应式 |

**scroll-view 高度计算：**

```css
.scan-list {
  height: calc(100vh - topBar高度px - card高度px - progressBar高度px - bottomBar高度px);
  padding: 0 24rpx;
  overflow-y: auto;
}
```

> ⚠️ 不推荐 `flex: 1`：低版本 Android WebView 中 `scroll-view` + `flex: 1` 可能导致高度计算为 0。用 `calc()` 显式计算更可靠。

**高度测量实现**（在 `onLoad` / `nextTick` 中执行）：

```ts
const scanListHeight = ref('100vh'); // 默认值

// ⚠️ 必须在数据加载完成后测量，否则 .card 内容为空，高度偏小。
// 将测量逻辑放在 initPage() 末尾（loadInventoryCache 之后）：
// async function initPage(): Promise<void> {
//   await loadOrder();
//   await loadScanItems();
//   await loadInventoryCache();
//   // 数据就绪后测量 DOM
//   nextTick(() => {
//     const query = uni.createSelectorQuery();
//     query.select('.top-bar').boundingClientRect();
//     query.select('.card').boundingClientRect();
//     query.select('.progress-bar').boundingClientRect();
//     query.select('.bottom-bar').boundingClientRect();
//     query.exec((results) => {
//       const totalFixed = results.reduce((sum, r) => sum + ((r as any)?.height || 0), 0);
//       scanListHeight.value = `calc(100vh - ${totalFixed}px)`;
//     });
//   });
// }
```

```html
<scroll-view class="scan-list" :style="{ height: scanListHeight }" scroll-y>...</scroll-view>
```

---

#### 4.8 样式优化：扫码列表紧凑化

| 属性 | 当前 | 建议 |
|------|------|------|
| `.scan-item` padding | `18rpx 20rpx` | `12rpx 16rpx` |
| `.scan-item` margin-bottom | `12rpx` | `8rpx` |
| `.scan-item` border-left | `6rpx` | `8rpx` |
| `.scan-code` font-size | `28rpx` | `30rpx` |
| `.scan-meta` font-size | `22rpx` | `24rpx` |

---

#### 4.9 样式优化：底部操作区两行布局

```
┌──────────────────────────────────────┐
│  [   扫描或输入条码               ]  │  ← 88rpx 高，32rpx 字号
│    → gap: 8rpx                       │
│  [    确  定    ]  [    扫  码    ]  │  ← 各占一半，80rpx 高
└──────────────────────────────────────┘
```

| 属性 | 当前 | 建议 |
|------|------|------|
| `.barcode-input` height | `76rpx` | `88rpx` |
| `.barcode-input` font-size | `28rpx` | `32rpx` |
| `.btn-confirm` / `.btn-camera` height | `76rpx` | `80rpx` |
| 布局方向 | 行内三元素 | `flex-direction: column; gap: 8rpx` |
| `.bottom-bar` padding | `16rpx 24rpx 32rpx` | `12rpx 24rpx 24rpx` |

> 空间精算：当前 124rpx → 两行 212rpx（+88rpx）。被 ❶ 对冲（+101-107rpx），净释放约 13-19rpx。

**键盘遮挡回退方案**：通过 `uni.onKeyboardHeightChange` 监听键盘弹出，键盘高度 > 0 时动态切换为单行布局：

```ts
const keyboardHeight = ref(0);
const isTwoRowMode = computed(() => keyboardHeight.value === 0);

// onLoad 中:
uni.onKeyboardHeightChange((res) => { keyboardHeight.value = res.height; });

// onUnload 中移除监听，防止泄漏：
onUnload(() => {
  uni.offKeyboardHeightChange();
});
```

```html
<view class="bottom-bar" :class="{ 'bottom-bar-row': !isTwoRowMode }">
```

```css
/* 键盘弹出时回退到单行 */
.bottom-bar-row {
  flex-direction: row;
  gap: 12rpx;
}
.bottom-bar-row .barcode-input { height: 76rpx; }
.bottom-bar-row .btn-confirm,
.bottom-bar-row .btn-camera { flex: 1; height: 76rpx; }
```

---

#### 4.10 交互优化：汇总弹窗关闭 ❸

**问题**：右上角 `×` 仅 40rpx（约26px），PDA 难以点击。

**方案**：去掉 `×`，改为底部固定全宽"关闭"按钮 + 遮罩点击关闭。

```
┌──────────────────────────────────────┐
│  汇总统计                            │
├──────────────────────────────────────┤
│  计划件数              30            │  ← .popup-body (overflow-y: auto)
│  ...                                 │     max-height: calc(85vh - 200rpx)
├──────────────────────────────────────┤
│  [          关  闭          ]        │  ← 固定底部，不参与滚动
└──────────────────────────────────────┘
```

**关键修正**：当前 `.popup` 有 `overflow: hidden`（源码 L650），会导致底部关闭按钮被裁切。必须移除并改用 `border-radius` 约束圆角：

```html
<view class="popup">   <!-- 移除 overflow: hidden -->
  <view class="popup-header">...</view>   <!-- border-radius: 16rpx 16rpx 0 0 -->
  <view class="popup-body">...</view>     <!-- overflow-y: auto -->
  <view class="popup-close-btn" @click="showSummary = false">关闭</view> <!-- border-radius: 0 0 16rpx 16rpx -->
</view>
```

```css
.popup {
  display: flex;
  flex-direction: column;
  width: 680rpx;
  max-height: 85vh;
  border-radius: 16rpx;
  background: #ffffff;
  /* 移除 overflow: hidden */
}
.popup-header {
  flex-shrink: 0;
  border-radius: 16rpx 16rpx 0 0;
}
.popup-body {
  flex: 1;
  min-height: 0;       /* 允许 flex 子元素收缩，配合 overflow-y: auto */
  overflow-y: auto;
}
.popup-close-btn {
  flex-shrink: 0;
  border-radius: 0 0 16rpx 16rpx;
}
```

---

#### 4.11 样式优化：汇总弹窗尺寸

| 属性 | 当前 | 建议 |
|------|------|------|
| `.popup` width | `640rpx` | `680rpx` |
| `.popup` max-height | `80vh` | `85vh` |
| `.popup-body` max-height | `55vh` | `calc(85vh - 200rpx)` |
| `.popup-body` font-size | `26rpx` | `28rpx` |
| `.ps-diff` font-size | `24rpx` | `26rpx` |

**❺ 弹窗滚动穿透**：`.overlay` 加 `@touchmove.stop.prevent`。

---

#### 4.12 新增：扫码视觉反馈

增加成功/失败的视觉反馈，**不改原有回填行为**：

```ts
const inputError = ref(false); // 新增

// onBarcodeConfirm 中的 catch 块——在 toast 之后、focusScannerInput 之后：
} catch (e) {
  // ... 原有逻辑（回填、播放失败音效、toast、恢复焦点）不变 ...
  // === 新增：输入框边框变红 ===
  inputError.value = true;
  setTimeout(() => { inputError.value = false; }, 300);
}
```

> `inputError` 赋值位置明确：catch 块最后一行，`focusScannerInput()` 之后。

```css
.input-error {
  border-color: #e74c3c !important;
  transition: border-color 0.15s ease;
}
```

---

#### 4.13 音频资源泄漏修复 ⓸

**问题**：`playFeedback()` 每次 `uni.createInnerAudioContext()`，0.5s 间隔下前一个 context 可能未销毁。源码中虽有 `destroy()`，但在 0.5s 窗口内可能尚未执行。

**修复**：复用单例 audio context：

```ts
let feedbackAudio: ReturnType<typeof uni.createInnerAudioContext> | null = null;

function playFeedback(type: 'success' | 'failure'): void {
  if (!feedbackAudio) {
    feedbackAudio = uni.createInnerAudioContext();
    feedbackAudio.onEnded(() => { /* 不 destroy，复用 */ });
    feedbackAudio.onError(() => {
    feedbackAudio?.destroy();
    feedbackAudio = null; // 重建：下次调用时自动重新 createInnerAudioContext
  });
  }
  feedbackAudio.stop();                      // 中断上次播放
  feedbackAudio.src = type === 'success' ? '/static/pass.wav' : '/static/fail.wav';
  feedbackAudio.play();
}
```

> 在 `onUnload` 中 `feedbackAudio?.destroy()`。

---

### 🟡 P1 — `orders/index.vue`（订单列表页）

#### 4.14 样式优化：顶部栏

| 属性 | 当前 | 建议 |
|------|------|------|
| `.title` font-size | `36rpx` | `34rpx` |
| `.hint` font-size | `24rpx` | `26rpx` |
| `.add-btn` | `64×56rpx` | `72×64rpx` |

#### 4.15 样式优化：订单卡片 + 状态色彩

| 属性 | 当前 | 建议 |
|------|------|------|
| `padding` | `24rpx` | `20rpx` |
| `margin-bottom` | `20rpx` | `14rpx` |
| `.order-no` font-size | `30rpx` | `32rpx` |
| `.status` font-size | `24rpx` | `26rpx` |
| `.meta-row` font-size | `26rpx` | `28rpx` |
| `.plan-item` font-size | `24rpx` | `26rpx` |

**状态色彩：**

```html
<text class="status" :class="'status-' + order.status">{{ statusText[order.status] }}</text>
```

| class | 颜色 |
|-------|------|
| `status-pending` | `#fa8c16` |
| `status-scanning` | `#1677ff` |
| `status-completed` | `#52c41a` |
| `status-cancelled` | `#9ca3af` |

卡片左侧色条：`:style="{ borderLeftColor: statusColor[order.status] }"`。

#### 4.16 空状态优化

📦 图标 + 大字标题 "暂无订单" + 副文字 "点击右上角「同步」获取订单"。

#### 4.17 下拉刷新 ❽

`pages.json` 中 `pages/orders/index` 添加 `"enablePullDownRefresh": true`。

```ts
import { onPullDownRefresh } from '@dcloudio/uni-app'; // 必须导入

onPullDownRefresh(async () => {
  await handleSync();
  uni.stopPullDownRefresh();
});
```

> ⚠️ `onPullDownRefresh` 必须在 `<script setup>` 顶层调用（不能在 `onLoad` 或普通函数内），否则 uni-app 框架无法识别该生命周期钩子。

#### 4.18 搜索栏 ❾

顶部栏下方增加搜索框（`height: 64rpx`），`computed` 过滤 `orders`。

---

### 🟡 P1 — 全局：网络状态指示 ⓲

App.vue 不渲染可见 DOM，改为独立组件在关键页面引入：

**`mobile/src/components/NetworkBar.vue`**：

```html
<template>
  <view class="network-bar" :class="isOnline ? 'online' : 'offline'" />
</template>
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
const isOnline = ref(true);
let handler: (res: { isConnected: boolean }) => void;
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

在 `scan.vue`、`orders/index.vue` 模板顶部 `<NetworkBar />` 引入。

---

### 🟡 P1 — 全局：TabBar 图标 ⓫

`pages.json` 中增加图标（路径须以 `/` 开头）：

```json
{
  "tabBar": {
    "list": [
      { "pagePath": "pages/orders/index", "text": "订单",
        "iconPath": "/static/tab-order.png",
        "selectedIconPath": "/static/tab-order-active.png" },
      { "pagePath": "pages/mine/index", "text": "我的",
        "iconPath": "/static/tab-mine.png",
        "selectedIconPath": "/static/tab-mine-active.png" }
    ]
  }
}
```

> ⚠️ 图标规格：81×81px PNG，灰色/蓝色两套，需**手动制作**放入 `mobile/src/static/`。当前该目录仅有 `pass.wav` 和 `fail.wav`。

---

### 🟢 P2 — `login/index.vue`（登录页）

#### 4.19 样式优化

| 属性 | 当前 | 建议 |
|------|------|------|
| `.page` padding | `72rpx 32rpx` | `48rpx 28rpx` |
| `.panel` padding | `36rpx 28rpx` | `32rpx 28rpx` |
| `.label` font-size | `26rpx` | `28rpx` |
| `.input` height | `88rpx` | `96rpx` |
| `button` height | 默认 | `88rpx` |

#### 4.20 键盘适配

`pages.json` 中为 login 页的 `style` 内部添加 `app-plus` 配置——必须嵌套在 `style` 下，不能放在页面根级：

```json
{
  "path": "pages/login/index",
  "style": {
    "navigationBarTitleText": "登录",
    "app-plus": {
      "softinputMode": "adjustResize"
    }
  }
}
```

> ⚠️ 该配置仅 `app-plus` 平台生效。本项目 PDA 为 App 端，无影响。若将来在浏览器调试（H5），需在 `manifest.json` 中额外配置。

#### 4.21 密码明文切换 ⓬

**关键修正**：`👁` / `👁‍🗨` emoji 在 Android 5-7 的 PDA 上可能缺失字体。改用纯文字按钮：

```html
<view class="field">
  <text class="label">密码</text>
  <view class="input-wrap">
    <input v-model="form.password" class="input" :password="!showPassword" placeholder="请输入密码" />
    <text class="pw-toggle" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</text>
  </view>
</view>
```

```css
.input-wrap { position: relative; }
.pw-toggle {
  position: absolute; right: 20rpx; top: 50%;
  transform: translateY(-50%);
  font-size: 26rpx; color: #1677ff;
  padding: 12rpx;
}
```

---

### 🟢 P2 — `create.vue`（创建订单页）

#### 4.22 结构修复：消除双重导航栏 ⓭

同 scan.vue，`pages.json` + `navigationStyle: custom` + JS `statusBarHeight` 安全区适配。

#### 4.23 结构优化：长表单滚动容器 ⓰

改为 flex + scroll-view，提交按钮固定底部：

```html
<view class="page">
  <view class="top-bar" :style="{ paddingTop: (16 + statusBarHeight) + 'px' }">...</view>
  <scroll-view class="form-scroll" scroll-y>
    <view class="form-card">...</view>
    <view class="form-card" v-for="...">...</view>
    <view class="add-plan">...</view>
  </scroll-view>
  <view class="submit-area">
    <button type="primary">保存订单</button>
  </view>
</view>
```

```

```css
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f6f7f9;
}
.form-scroll {
  flex: 1;
  min-height: 0;
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

> ⚠️ create.vue 对滚动性能要求低于 scan.vue（不涉及 0.5s 连续扫码），`flex: 1` + `min-height: 0` 在此场景可接受。若实测低版 WebView 有兼容问题，参考 §4.7 的 `calc()` 方案。

> 键盘处理：create.vue 的表单字段较少（通常 1-3 个产品明细），依赖 `softinputMode: adjustResize` 自动调整，无需额外 `onKeyboardHeightChange` 监听——与 scan.vue 的主动键盘回退策略不同。

#### 4.24 样式优化

| 属性 | 当前 | 建议 |
|------|------|------|
| `.form-card` padding | `28rpx 24rpx` | `24rpx 20rpx` |
| `.label` font-size | `26rpx` | `28rpx` |
| `.input` height | `80rpx` | `88rpx` |
| `.field` margin-bottom | `20rpx` | `24rpx` |
| `.plan-title` font-size | `28rpx` | `30rpx` |
| 提交按钮 height | 默认 | `88rpx` |

#### 4.25 字段校验视觉反馈 ⓮

`fieldErrors` reactive + `.input-error` class。

**Key 命名**：`plan_0_code` / `plan_0_qty`。

**模板绑定示例**：

```html
<input v-model="form.vehicleNo" class="input"
  :class="{ 'input-error': fieldErrors.vehicleNo }"
  @input="delete fieldErrors.vehicleNo" />
<input v-model="plan.productCode" class="input"
  :class="{ 'input-error': fieldErrors['plan_' + index + '_code'] }"
  @input="delete fieldErrors['plan_' + index + '_code']" />
```

```css
.input-error { border-color: #e74c3c !important; }
```

**`removePlan` 同步清理（关键修正）**：不能在 `showModal` 之前清除非当前索引的 errors——用户点"取消"后 fieldErrors 已被误删。正确做法：在 `res.confirm` 分支内清理：

```ts
function removePlan(index: number): void {
  if (form.plans.length <= 1) return;

  uni.showModal({
    title: '确认删除',
    content: `确定删除产品明细 ${index + 1}？`,
    success: (res) => {
      if (!res.confirm) return; // ← 关键：取消时直接返回，不清理 fieldErrors

      // 清理被删索引的 errors
      delete fieldErrors[`plan_${index}_code`];
      delete fieldErrors[`plan_${index}_qty`];
      // 重排后续索引
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

### 🟢 P3 — `mine/index.vue`（个人中心）

#### 4.26 样式优化

| 属性 | 当前 | 建议 |
|------|------|------|
| `.row` padding | `16rpx 0` | `20rpx 0` |
| `.row` font-size | `26rpx` | `28rpx` |
| `.label` color | `#6b7280` | `#4b5563` |
| `.panel` padding | `24rpx` | `28rpx 24rpx` |
| `button` height | 默认 | `88rpx` |

#### 4.27 退出登录确认弹窗 ⓱

`handleLogout` 内部先 `uni.showModal` 确认，再执行原有逻辑。红色危险按钮 `.logout-danger` + 浅红背景 `#fff1f0`。

---

## 五、全局设计规范

| 规范 | 值 | 理由 |
|------|------|------|
| 背景色 | `#f6f7f9` | 保持 |
| 卡片色 | `#ffffff`，圆角 `12rpx` | 保持 |
| **最小触控高度** | **`72rpx`** | PDA 操作 |
| 正文字号下限 | `24rpx` | 仓库光照 |
| 主轴字号 | `28-30rpx` | 可读性 |
| 输入框高度 | `88-96rpx` | 手套友好 |
| 状态颜色 | 橙(`#fa8c16`)/蓝(`#1677ff`)/绿(`#52c41a`)/灰(`#9ca3af`) | 一眼识别 |
| 安全区 | JS `statusBarHeight` + `:style` 绑定 | uni-app 无 CSS 变量 |
| tabBar | 文字 +2rpx，选中加粗，`/static/` 图标 | 需手动制作 |
| 网络状态 | `<NetworkBar>` 组件 | App.vue 不渲染 DOM |
| **全局触摸禁用** | `* { -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; }` | 消除 PDA 长按选择和高亮 |
| 不可逆操作 | 全部 `uni.showModal` | 防误触 |

> ⚠️ `*` 选择器会影响所有元素（包括 `scroll-view` 内文本）。如需后续支持"长按复制"功能，在特定元素上覆盖 `user-select: text`。

---

## 六、完整问题清单（32 项）

```
编号  页面          类型       问题                             修复方式
─────────────────────────────────────────────────────────────────────────────
 ❶   scan.vue      结构       双重导航栏（实占 101-107px）     pages.json + navigationStyle: custom
 ❷   scan.vue      交互       删除按钮 36rpx 无法点击           左滑手势 + 120rpx 按钮（rpx→px 手动转换）
 ❸   scan.vue      交互       汇总弹窗 × 无法点击              底部固定按钮 + .popup 移除 overflow:hidden
 ❹   scan.vue      性能       0.5s 快速扫码列表渲染性能        分离 active/deleted·DOM 简化·calc() 固定高度
 ❺   scan.vue      边界       弹窗滚动边界不足                  max-height: calc(85vh - 200rpx)
 ❻   scan.vue      边界       弹窗滚动穿透遮罩                  @touchmove.stop.prevent
 ❼   scan.vue      防护       提交按钮无防重复(submitting 位置)  early return 之后设 true
 ⓸   scan.vue      泄漏       playFeedback 高频创建 audio       单例复用
 ❽   orders/index  功能       无下拉刷新（缺 import）            enablePullDownRefresh + import onPullDownRefresh
 ❾   orders/index  功能       无搜索/筛选                      搜索栏 + computed 过滤
 ❿   orders/index  样式       状态颜色单一                      四色 :class 动态绑定
 ⓫   global        样式       TabBar 无图标（图标需手动制作）    /static/ iconPath
 ⓬   login/index   功能       密码无明文切换（emoji 风险）       文字按钮 "显示"/"隐藏"
 ⓭   create.vue    结构       双重导航栏                       pages.json + navigationStyle: custom
 ⓮   create.vue    交互       无字段级校验(removePlan 时序)      fieldErrors 同步清理（confirm 分支内）
 ⓯   create.vue    交互       removePlan 无确认                uni.showModal
 ⓰   create.vue    结构       长表单无滚动容器+底部无安全区      flex + scroll-view + safe-area-inset-bottom
 ⓱   mine/index    交互       退出登录无确认                    uni.showModal
 ⓲   global        功能       无网络状态指示                    <NetworkBar> 组件
——   以下为样式类 ——
 19   scan.vue      样式       顶部按钮偏小                      56→64rpx
 20   scan.vue      样式       卡片间距偏大                      24→20rpx padding
 21   scan.vue      样式       进度条太细                        8→12rpx
 22   scan.vue      样式       扫码项目间距偏大                  18→12rpx padding
 23   scan.vue      样式       底部输入栏单行拥挤                两行布局+键盘回退(onKeyboardHeightChange)
 24   scan.vue      样式       弹窗偏窄                          640→680rpx
 25   scan.vue      样式       缺少视觉反馈(回填保留·toast 后赋值) inputError class
 26   orders/index  样式       空状态简陋                        图标 + 引导文字
 27   orders/index  样式       卡片垂直间距偏大                  20→14rpx
 28   login/index   样式       输入框偏小                        88→96rpx
 29   create.vue    样式       输入框偏小                        80→88rpx
 30   mine/index    样式       信息行间距紧凑                    16→20rpx padding
 31   (all)         样式       user-select/tap-highlight         全局 CSS 禁用
 32   scan.vue      样式       scroll-view flex:1 兼容风险       calc() 显式高度
——   login/create/mine 字号间距等多项调整不逐一编号
```

---

## 七、实施阶段与工时

```
阶段     范围                 内容                                     估算
────────────────────────────────────────────────────────────────────────────
第1天    scan.vue            ① 双重导航栏  ② 安全区  ③ 底部两行布局     5h
                             ④ 列表紧凑化  ⑤ 进度条  ⑥ 提交防重复
                             ⑦ playFeedback 单例
第2天    scan.vue（续）      ⑧ 左滑删除（rpx→px·swipeVersion·getScanItemEl） 6h
                             ⑨ 列表性能优化（calc 高度·DOM 简化）
第3天    scan.vue（续）      ⑩ 汇总弹窗（overflow 修正·关闭按钮·尺寸）  3h
                             ⑪ 扫码视觉反馈（inputError·toast 后赋值）   1h
        orders/index        ⑫ 状态四色 + 卡片紧凑 + 左侧色条            2h
第4天    orders/index（续）  ⑬ 下拉刷新(import) + 搜索栏 + 空状态        2h
        login/index         ⑭ 输入框 + 键盘适配 + 密码切换(文字按钮)     2h
        create.vue          ⑮ 双导航栏 + 滚动容器 + 校验反馈             3h
                             （removePlan fieldErrors 时序修正+底部安全区）
第5天    create.vue（续）    ⑯ removePlan 确认 + 按钮增大                1h
        mine/index          ⑰ 信息行优化 + 退出确认                      1h
        全局                ⑱ TabBar 图标制作 + NetworkBar 组件          3h
                             + user-select/tap-highlight + 走查
────────────────────────────────────────────────────────────────────────────
合计                                                                     30h
```

---

## 八、涉及文件清单

| 文件 | 修改类型 | 变更说明 |
|------|---------|---------|
| `mobile/src/pages/orders/scan.vue` | 重构 | 左滑删除(rpx→px 转换·swipeVersion·getScanItemEl)、底部两行布局(gap+键盘回退)、列表紧凑、弹窗关闭(overflow 修正)、视觉反馈(toast 后赋值)、安全区(JS+:style)、性能优化(calc 高度·audio 单例)、提交防重复(submitting 位置) |
| `mobile/src/pages/orders/index.vue` | 优化 | 状态四色(:class)、卡片紧凑、空状态、左侧色条、下拉刷新(+import)、搜索栏、引入 `<NetworkBar>` |
| `mobile/src/pages/login/index.vue` | 优化 | 输入框增大、键盘适配(仅 app-plus)、密码切换(文字按钮) |
| `mobile/src/pages/orders/create.vue` | 重构 | 双导航栏修复、长表单滚动容器(flex+scroll-view)、校验反馈(fieldErrors·removePlan 时序修正)、removePlan 确认、安全区(JS+:style + safe-area-inset-bottom) |
| `mobile/src/pages/mine/index.vue` | 优化 | 信息行优化、退出确认、按钮样式(.logout-danger) |
| `mobile/src/components/NetworkBar.vue` | **新增** | 网络状态条组件 |
| `mobile/src/pages.json` | 配置 | scan/create: `navigationStyle: custom`；orders/index: `enablePullDownRefresh`；login: `softinputMode`(app-plus)；tabBar: `iconPath`(`/static/`) |
| `mobile/src/static/` | 新增 | tabBar 图标 4 枚（81×81px PNG，手动制作） |
| `mobile/src/App.vue` | 微调 | 全局 CSS：user-select/tap-highlight 禁用 |

---

## 九、v5→v8 审查修正清单

| 编号 | 类型 | v5 问题 | v6 修正 |
|------|------|---------|---------|
| E1 | 错误 | `getScanItemElement(id)` 未定义 | → `getScanItemEl(id)` 通过 ref 缓存或 `createSelectorQuery` |
| E2 | 错误 | `removePlan` 中 fieldErrors 在 modal 之前清理 | → 移入 `res.confirm` 分支 |
| E3 | 错误 | 声称移除不存在的 "opacity transition" | → 删除该优化项 |
| E4 | 错误 | `.popup` overflow:hidden 裁切关闭按钮 | → 移除 overflow，改用 border-radius 约束 |
| E5 | 错误 | `👁` emoji 在低版本 Android 不渲染 | → 改为文字 "显示"/"隐藏" |
| E6 | 错误 | `inputError` 赋值位置模糊 | → 明确：catch 块最后，`focusScannerInput()` 之后 |
| M1 | 遗漏 | playFeedback 高频创建 audio | → 补充单例复用方案 |
| M2 | 遗漏 | onPullDownRefresh 缺 import | → 补充 `import { onPullDownRefresh }` |
| M3 | 遗漏 | §31 全局 CSS 无代码 | → 补充 `* { -webkit-user-select: none; ... }` |
| M4 | 遗漏 | scroll-view 高度未说明算法 | → 补充 `calc()` 方案 + `createSelectorQuery` 测量 |
| M5 | 遗漏 | TabBar 图标需手动制作 | → 标注 + 提供规格 |
| M6 | 遗漏 | submitting=true 位置未明确 | → 明确：early return 之后 |
| M7 | 遗漏 | softinputMode 仅 app-plus 生效 | → 标注平台限制 |
| M8 | 遗漏 | create.vue 提交按钮无安全区 | → 补充 `safe-area-inset-bottom` |
| P1 | 风险 | JS 中 rpx 拼接不被编译 | → 手动 `rpx2px()` 转换，`transform` 用 px 值 |
| P2 | 风险 | scroll-view flex:1 兼容 | → 改为 `calc()` 显式计算 |
| P3 | 风险 | 导航栏高度 "约44px" 不准确 | → 修正为 68-74px（statusBar + titleBar） |
| P4 | 风险 | 键盘遮挡回退无代码 | → 补充 `onKeyboardHeightChange` 完整实现 |

---

## 十、关键设计原则

1. **PDA 交互 = 大触控目标 + 手势**：删除用左滑（rpx→px 量化为逻辑 px），关闭用固定全宽按钮
2. **0.5s 扫码 ≠ 普通列表渲染**：分离 active/deleted·显式 calc 高度·audio 单例·手势直接操作 DOM
3. **垂直空间精算**：消除双导航栏（101-107px）对冲底部栏增加（88rpx），净释放 13-19px
4. **不改业务逻辑**：所有修改在模板·CSS·pages.json·纯 UI 交互壳内
5. **实施细节不可忽略**：JS 中 rpx 不被编译→手动转换；emoji 在低版 Android 不渲染→用文字；overflow 裁切→移除
6. **时序敏感操作**：fieldErrors 在 confirm 分支清理；submitting 在 early return 后赋值；inputError 在 toast 后赋值
7. **不可逆操作加确认**：全部 `uni.showModal`
