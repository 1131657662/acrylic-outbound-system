<template>
  <NetworkBar />
  <view class="page">
    <!-- 顶部栏 -->
    <view class="top-bar" :style="{ paddingTop: (16 + statusBarHeight) + 'px' }">
      <view class="top-left" @click="goBack">
        <text class="back-icon">←</text>
        <text class="top-title">扫码出库</text>
      </view>
      <view class="top-right">
        <button class="top-btn" size="mini" type="default" @click="showSummary = true">汇总</button>
        <button class="top-btn submit-btn" size="mini" type="primary"
          :disabled="submitting" :loading="submitting" @click="handleSubmit">提交</button>
      </view>
    </view>

    <!-- 订单信息卡片 -->
    <view class="card">
      <view class="card-row">
        <text class="label">订单号</text>
        <text class="value">{{ order?.order_no || '-' }}</text>
      </view>
      <view class="card-row">
        <text class="label">车牌号</text>
        <text class="value">{{ order?.vehicle_no || '-' }}</text>
      </view>
      <view class="card-row">
        <text class="label">计划 / 已扫</text>
        <text class="value">
          {{ scannedCount }} / {{ order?.total_planned_qty || 0 }} 件
          (<text :class="overPlanned ? 'over' : ''">{{ overPlanned ? '超发 ' + overCount + ' 件' : '未超' }}</text>)
        </text>
      </view>
    </view>

    <!-- 进度条 -->
    <view class="progress-bar">
      <view class="progress-fill" :style="{ width: progressPct + '%' }"></view>
    </view>

    <!-- 扫码记录列表 -->
    <scroll-view class="scan-list" :style="{ height: scanListHeight }" scroll-y>
      <view v-if="scanItems.length === 0" class="empty-hint">
        <text>等待扫码…</text>
      </view>

      <!-- active 条目：支持左滑 -->
      <view class="scan-item" v-for="item in activeScanItems" :key="item.client_item_id"
        :ref="(el: any) => { if (el) scanItemEls.value[item.client_item_id] = { contentEl: el.querySelector('.scan-item-content') }; }">
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

    <!-- 底部输入区 -->
    <view class="bottom-bar" :class="{ 'bottom-bar-row': !isTwoRowMode }">
      <input
        ref="barcodeInput"
        class="barcode-input"
        :class="{ 'input-error': inputError }"
        type="text"
        v-model="barcode"
        @confirm="onBarcodeConfirm"
        :focus="inputFocus"
        :confirm-hold="true"
        confirm-type="done"
        placeholder="扫描或输入条码"
      />
      <view class="bottom-btns">
        <button class="btn-confirm" size="mini" @click="onBarcodeConfirm()">确定</button>
        <button class="btn-camera" size="mini" @click="openCamera">扫码</button>
      </view>
    </view>

    <!-- 汇总弹窗 -->
    <view v-if="showSummary" class="overlay" @click="showSummary = false" @touchmove.stop.prevent>
      <view class="popup" @click.stop>
        <view class="popup-header">
          <text class="popup-title">汇总统计</text>
        </view>
        <view class="popup-body">
          <view class="summary-row">
            <text>计划件数</text><text>{{ summary.total_planned_qty }}</text>
          </view>
          <view class="summary-row">
            <text>计划吨位</text><text>{{ summary.total_planned_weight.toFixed(3) }}</text>
          </view>
          <view class="summary-row">
            <text>已扫件数</text><text>{{ summary.total_scanned_qty }}</text>
          </view>
          <view class="summary-row">
            <text>已扫吨位</text><text>{{ summary.total_scanned_weight.toFixed(3) }}</text>
          </view>
          <view class="divider"></view>
          <view v-for="p in summary.products" :key="p.product_code" class="product-stat">
            <text class="ps-code">{{ p.product_code }} {{ p.model }}</text>
            <text class="ps-qty">计划 {{ p.planned_qty }} 件 / 已扫 {{ p.scanned_qty }} 件</text>
            <text class="ps-diff" :class="p.diff_qty > 0 ? 'over' : ''">差异 {{ p.diff_qty > 0 ? '+' : '' }}{{ p.diff_qty }} 件</text>
          </view>
        </view>
        <view class="popup-close-btn" @click="showSummary = false">关闭</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import NetworkBar from '../../components/NetworkBar.vue';
import { onHide, onLoad, onUnload } from '@dcloudio/uni-app';
import type { InventoryRow, LocalOrderItem, OrderRow, ScanSummary, ProductScanStat } from '../../types';
import {
  getLocalInventory,
  getLocalOrders,
  getScanItems,
  markScanItemsSynced,
} from '../../utils/local_db';
import { submitOrderItems } from '../../services/submit';
import { getUser, getToken } from '../../utils/storage';

interface BarcodeConfirmEvent {
  detail?: {
    value?: string;
  };
}

const INVENTORY_STORAGE_KEY = 'acrylic_local_inventory';
const SCAN_ITEMS_KEY_PREFIX = 'acrylic_local_scan_items_';
const PERSIST_DELAY_MS = 1200;

const orderId = ref(0);
const order = ref<OrderRow | null>(null);
const scanItems = ref<LocalOrderItem[]>([]);
const barcode = ref('');
const inputFocus = ref(true);
const showSummary = ref(false);
const statusBarHeight = ref(0);
const submitting = ref(false);
const keyboardHeight = ref(0);
const isTwoRowMode = computed(() => keyboardHeight.value === 0);
const inputError = ref(false);
const activeScanItems = computed(() => scanItems.value.filter(it => it.status === 'active'));
const deletedScanItems = computed(() => scanItems.value.filter(it => it.status === 'deleted'));
const scanListHeight = ref('100vh');
let inventoryCache: InventoryRow[] = [];
let inventoryByRoll = new Map<string, InventoryRow>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let hasPendingPersist = false;

onLoad((options?: Record<string, string>) => {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0;
  uni.onKeyboardHeightChange((res) => { keyboardHeight.value = res.height; });
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/index' });
    return;
  }
  orderId.value = Number(options?.id || 0);
  if (!orderId.value) {
    uni.showToast({ title: '订单 ID 错误', icon: 'none' });
    return;
  }
  initPage();
});

onUnload(() => {
  flushLocalScanState();
  uni.offKeyboardHeightChange();
});

onHide(() => {
  flushLocalScanState();
});

async function initPage(): Promise<void> {
  await loadOrder();
  await loadScanItems();
  await loadInventoryCache();
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
}

async function loadOrder(): Promise<void> {
  const orders = await getLocalOrders();
  order.value = orders.find(o => o.id === orderId.value) || null;
}

async function loadScanItems(): Promise<void> {
  scanItems.value = await getScanItems(orderId.value);
}

async function loadInventoryCache(): Promise<void> {
  inventoryCache = await getLocalInventory();
  inventoryByRoll = new Map(inventoryCache.map(row => [row.roll_code, row]));
}

const scannedCount = computed(() =>
  scanItems.value.filter(it => it.status === 'active').length
);

const scannedWeight = computed(() =>
  scanItems.value
    .filter(it => it.status === 'active')
    .reduce((sum, it) => sum + Number(it.weight), 0)
);

const progressPct = computed(() => {
  const planned = order.value?.total_planned_qty || 1;
  return Math.min(100, Math.round((scannedCount.value / planned) * 100));
});

const overCount = computed(() => {
  const planned = order.value?.total_planned_qty || 0;
  return Math.max(0, scannedCount.value - planned);
});

const overPlanned = computed(() => overCount.value > 0);

const summary = computed<ScanSummary>(() => {
  const plans = order.value?.plans || [];
  const activeItems = scanItems.value.filter(it => it.status === 'active');
  const products: ProductScanStat[] = plans.map(plan => {
    const codeItems = activeItems.filter(it => it.product_code === plan.product_code);
    const scannedQty = codeItems.length;
    const scannedWeight = codeItems.reduce((sum, it) => sum + Number(it.weight), 0);
    return {
      product_code: plan.product_code,
      model: plan.model,
      planned_qty: plan.planned_qty,
      scanned_qty: scannedQty,
      planned_weight: Number(plan.planned_weight),
      scanned_weight: scannedWeight,
      diff_qty: scannedQty - plan.planned_qty,
    };
  });
  return {
    total_planned_qty: order.value?.total_planned_qty || 0,
    total_planned_weight: Number(order.value?.total_planned_weight || 0),
    total_scanned_qty: scannedCount.value,
    total_scanned_weight: scannedWeight.value,
    products,
  };
});

function onBarcodeConfirm(event?: BarcodeConfirmEvent): void {
  const code = getConfirmBarcode(event);
  if (!code) {
    focusScannerInput();
    return;
  }

  barcode.value = '';
  focusScannerInput();

  try {
    matchBarcodeSync(code);
    playFeedback('success');
  } catch (e) {
    barcode.value = code;
    playFeedback('failure');
    uni.showToast({ title: (e as Error).message, icon: 'none', duration: 600 });
    focusScannerInput();
    inputError.value = true;
    setTimeout(() => { inputError.value = false; }, 300);
  }
}

function getConfirmBarcode(event?: BarcodeConfirmEvent): string {
  return (event?.detail?.value ?? barcode.value).trim();
}

function focusScannerInput(): void {
  nextTick(() => {
    inputFocus.value = true;
  });
}

let feedbackAudio: ReturnType<typeof uni.createInnerAudioContext> | null = null;

function playFeedback(type: 'success' | 'failure'): void {
  try {
    if (!feedbackAudio) {
      feedbackAudio = uni.createInnerAudioContext();
      feedbackAudio.onEnded(() => { /* 复用，不销毁 */ });
      feedbackAudio.onError(() => {
        feedbackAudio?.destroy();
        feedbackAudio = null; // 下次调用时重建
      });
    }
    feedbackAudio.stop();
    feedbackAudio.src = type === 'success' ? '/static/pass.wav' : '/static/fail.wav';
    feedbackAudio.play();
  } catch (_) {
    // 静默忽略
  }
}

// 直接从内存缓存查库存/验重/maxSeq，零 Storage IO
function getCachedInventory(rollCode: string): { inv: InventoryRow; idx: number } | null {
  const inv = inventoryByRoll.get(rollCode);
  if (!inv || inv.status !== 'available') return null;
  return { inv, idx: inventoryCache.indexOf(inv) };
}

function isDuplicateInMemory(orderId: number, rollCode: string): boolean {
  return scanItems.value.some(it => it.roll_code === rollCode && it.status === 'active');
}

function getNextScanSeq(): number {
  return scanItems.value.reduce((max, it) => Math.max(max, it.scan_seq), 0) + 1;
}

function matchBarcodeSync(rollCode: string): void {
  if (!order.value) throw new Error('订单数据未加载');

  // 1. 截取前3位作为 product_code
  if (rollCode.length < 3) throw new Error('条码格式错误');
  const productCode = rollCode.slice(0, 3);

  // 2. 校验是否属于订单计划
  const plan = (order.value.plans || []).find(p => p.product_code === productCode);
  if (!plan) throw new Error('产品代码 ' + productCode + ' 不属于本订单');

  // 3. 内存查库存（同步，零 IO）
  const cached = getCachedInventory(rollCode);
  if (!cached) throw new Error('条码不存在或已出库');

  // 4. 内存查验重（同步，零 IO）
  if (isDuplicateInMemory(orderId.value, rollCode)) throw new Error('该卷已在本订单出库过');

  // 5-6. 本地计算 scan_seq 和 client_item_id
  const scanSeq = getNextScanSeq();
  const clientItemId = generateClientItemId();

  // 7. 获取操作人和设备
  const user = getUser();
  const deviceId = getDeviceId();
  const now = formatDateTime(new Date());

  const item: LocalOrderItem = {
    client_item_id: clientItemId,
    order_id: orderId.value,
    product_code: productCode,
    model: cached.inv.model,
    roll_code: rollCode,
    weight: cached.inv.weight,
    scan_seq: scanSeq,
    scanned_at: now,
    status: 'active',
    synced: 0,
    device_id: deviceId,
    operator: user?.username || 'unknown',
  };

  // 8. 内存即时追加（不等待 Storage 写完成）
  scanItems.value.push(item);

  // 9. 只更新内存，Storage 在扫码暂停后批量落盘，避免阻塞下一枪
  cached.inv.status = 'shipped';
  schedulePersistLocalState();

  // 静默成功，不弹 Toast 干扰连续扫码
}

function schedulePersistLocalState(): void {
  hasPendingPersist = true;
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(flushLocalScanState, PERSIST_DELAY_MS);
}

function flushLocalScanState(): void {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (!hasPendingPersist || !orderId.value) return;

  const inventorySnapshot = inventoryCache.map(row => ({ ...row }));
  const scanItemSnapshot = scanItems.value.map(item => ({ ...item }));
  uni.setStorageSync(INVENTORY_STORAGE_KEY, inventorySnapshot);
  uni.setStorageSync(SCAN_ITEMS_KEY_PREFIX + orderId.value, scanItemSnapshot);
  hasPendingPersist = false;
}

function generateClientItemId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${ts}-${rand}`;
}

function getDeviceId(): string | null {
  try {
    const info = uni.getSystemInfoSync();
    return info.deviceId || info.model || null;
  } catch {
    return null;
  }
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function handleDeleteItem(item: LocalOrderItem): void {
  // 内存即时标记删除
  const target = scanItems.value.find(it => it.client_item_id === item.client_item_id);
  if (target) target.status = 'deleted';

  const inv = inventoryByRoll.get(item.roll_code);
  if (inv) inv.status = 'available';

  schedulePersistLocalState();

  uni.showToast({ title: '已删除', icon: 'success' });
}

// --- 左滑删除手势 ---
const screenWidth = uni.getSystemInfoSync().screenWidth;
const rpx2px = (v: number) => v * (screenWidth / 750);
const DELETE_WIDTH = rpx2px(120);
const SNAP_THRESHOLD = rpx2px(50);

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
// --- 左滑删除结束 ---

function openCamera(): void {
  uni.scanCode({
    success: res => {
      barcode.value = res.result;
      onBarcodeConfirm();
    },
    fail: () => {
      uni.showToast({ title: '扫码取消', icon: 'none' });
    },
  });
}

async function handleSubmit(): Promise<void> {
  flushLocalScanState();

  const unsynced = scanItems.value.filter(it => it.synced === 0 && it.status === 'active');
  if (!unsynced.length) {
    uni.showToast({ title: '没有可提交的扫码记录', icon: 'none' });
    return;
  }

  submitting.value = true;
  try {
    const confirmText = overPlanned.value
      ? `已超发 ${overCount.value} 件，确认提交？`
      : `确认提交 ${unsynced.length} 条扫码记录？`;

    const { confirm } = await uni.showModal({
      title: '提交确认',
      content: confirmText,
    });
    if (!confirm) return;

    flushLocalScanState();
    const result = await submitOrderItems(orderId.value, unsynced);
    await markScanItemsSynced(unsynced.map(it => it.client_item_id));
    await loadScanItems();

    let msg = '提交成功';
    if (result.overPlanned) msg += `（超发 ${result.overCount} 件）`;
    playFeedback('success');
    uni.showToast({ title: msg, icon: 'success' });
  } catch (error) {
    playFeedback('failure');
    uni.showToast({ title: error instanceof Error ? error.message : '提交失败', icon: 'none' });
  } finally {
    submitting.value = false;
  }
}

function goBack(): void {
  uni.navigateBack();
}
</script>

<style>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f6f7f9;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  background: #ffffff;
  border-bottom: 1px solid #eef0f4;
}

.top-left {
  display: flex;
  align-items: center;
}

.back-icon {
  color: #1677ff;
  font-size: 44rpx;
  font-weight: 700;
  margin-right: 12rpx;
}

.top-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2329;
}

.top-right {
  display: flex;
  gap: 16rpx;
}

.top-btn {
  margin: 0;
  height: 64rpx;
  line-height: 64rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  border-radius: 8rpx;
}

.submit-btn {
  font-weight: 700;
}

.card {
  margin: 16rpx 24rpx;
  padding: 20rpx 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.card-row {
  display: flex;
  justify-content: space-between;
  padding: 8rpx 0;
  font-size: 30rpx;
}

.label {
  color: #4b5563;
}

.value {
  color: #1f2329;
  font-weight: 500;
}

.over {
  color: #e74c3c;
  font-weight: 700;
}

.progress-bar {
  height: 12rpx;
  margin: 0 24rpx 12rpx;
  border-radius: 4rpx;
  background: #e5e6eb;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4rpx;
  background: linear-gradient(90deg, #1677ff, #52c41a);
  transition: width 0.25s ease;
}

.scan-list {
  flex: 1;
  padding: 0 24rpx;
  overflow-y: auto;
}

.empty-hint {
  padding: 48rpx 24rpx;
  text-align: center;
  color: #6b7280;
  font-size: 26rpx;
}

.scan-item {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  margin-bottom: 8rpx;
  padding: 12rpx 16rpx;
  border-radius: 8rpx;
  background: #ffffff;
  border-left: 8rpx solid #1677ff;
}

.swipe-delete-btn {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 120rpx;
  background: #e74c3c;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-item-content {
  position: relative;
  z-index: 1;
  width: 100%;
  background: #ffffff;
  transition: transform 0.2s ease;
}

.scan-item.deleted,
.deleted-item {
  height: 44rpx;
  padding: 0 20rpx;
  background: #f9fafb;
  border-left: 6rpx solid #9ca3af;
  opacity: 0.6;
}
.deleted-label {
  font-size: 24rpx;
  color: #6b7280;
}

.scan-item-left {
  display: flex;
  flex-direction: column;
}

.scan-code {
  font-size: 30rpx;
  color: #1f2329;
  font-weight: 600;
}

.scan-meta {
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #6b7280;
}

/* 底部栏 — 两行布局 */
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
.btn-confirm,
.btn-camera {
  flex: 1;
  margin: 0;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 8rpx;
  font-size: 30rpx;
}
.btn-confirm {
  background: #1677ff;
  color: #ffffff;
}
.btn-camera {
  background: #f0f2f5;
  color: #1f2329;
}

/* 键盘弹出时回退到单行 */
.bottom-bar-row { flex-direction: row; gap: 12rpx; }
.bottom-bar-row .barcode-input { flex: 1; height: 76rpx; font-size: 28rpx; }
.bottom-bar-row .btn-confirm,
.bottom-bar-row .btn-camera { flex: 1; height: 76rpx; font-size: 26rpx; }

/* 输入失败闪烁 */
.input-error {
  border-color: #e74c3c !important;
  transition: border-color 0.15s ease;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1px solid #eef0f4;
  border-radius: 16rpx 16rpx 0 0;
}
.popup-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2329;
}
.popup-body {
  flex: 1;
  min-height: 0;
  padding: 24rpx 32rpx 32rpx;
  overflow-y: auto;
  font-size: 28rpx;
}
.popup-close-btn {
  flex-shrink: 0;
  height: 80rpx;
  line-height: 80rpx;
  background: #f0f2f5;
  color: #1f2329;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
  border-radius: 0 0 16rpx 16rpx;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  font-size: 28rpx;
  color: #1f2329;
}

.divider {
  height: 1px;
  margin: 16rpx 0;
  background: #eef0f4;
}

.product-stat {
  padding: 16rpx 0;
  border-bottom: 1px solid #eef0f4;
}

.ps-code {
  display: block;
  font-size: 28rpx;
  color: #1f2329;
  font-weight: 600;
}

.ps-qty {
  display: block;
  margin-top: 4rpx;
  font-size: 26rpx;
  color: #6b7280;
}

.ps-diff {
  display: block;
  margin-top: 2rpx;
  font-size: 26rpx;
}
</style>
