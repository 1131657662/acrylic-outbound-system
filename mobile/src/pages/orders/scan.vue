<template>
  <view class="page">
    <!-- 顶部栏 -->
    <view class="top-bar">
      <view class="top-left" @click="goBack">
        <text class="back-icon">←</text>
        <text class="top-title">扫码出库</text>
      </view>
      <view class="top-right">
        <button class="top-btn" size="mini" type="default" @click="showSummary = true">汇总</button>
        <button class="top-btn submit-btn" size="mini" type="primary" @click="handleSubmit">提交</button>
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
    <scroll-view class="scan-list" scroll-y>
      <view v-if="scanItems.length === 0" class="empty-hint">
        <text>等待扫码…</text>
      </view>
      <view v-for="item in scanItems" :key="item.client_item_id" class="scan-item"
        :class="{ deleted: item.status === 'deleted' }">
        <view class="scan-item-left">
          <text class="scan-code">{{ item.product_code }} · {{ item.roll_code }}</text>
          <text class="scan-meta">{{ item.model }} | {{ Number(item.weight).toFixed(3) }} kg</text>
          <text class="scan-meta">#{{ item.scan_seq }} · {{ item.scanned_at }}</text>
        </view>
        <view v-if="item.status === 'active'" class="scan-item-right">
          <text class="delete-btn" @click="handleDeleteItem(item)">×</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部输入区 -->
    <view class="bottom-bar">
      <input
        ref="barcodeInput"
        class="barcode-input"
        type="text"
        v-model="barcode"
        @confirm="onBarcodeConfirm"
        :focus="inputFocus"
        :confirm-hold="true"
        confirm-type="done"
        placeholder="扫描或输入条码"
      />
      <button class="btn-confirm" size="mini" @click="onBarcodeConfirm()">确定</button>
      <button class="btn-camera" size="mini" @click="openCamera">扫码</button>
    </view>

    <!-- 汇总弹窗 -->
    <view v-if="showSummary" class="overlay" @click="showSummary = false">
      <view class="popup" @click.stop>
        <view class="popup-header">
          <text class="popup-title">汇总统计</text>
          <text class="popup-close" @click="showSummary = false">×</text>
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
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import type { InventoryRow, LocalOrderItem, OrderRow, ScanSummary, ProductScanStat } from '../../types';
import {
  getLocalOrders,
  getScanItems,
  markScanItemsSynced,
  saveScanItem,
  deleteScanItem as delScanItem,
} from '../../utils/local_db';
import { submitOrderItems } from '../../services/submit';
import { getUser, getToken } from '../../utils/storage';

interface BarcodeConfirmEvent {
  detail?: {
    value?: string;
  };
}

const orderId = ref(0);
const order = ref<OrderRow | null>(null);
const scanItems = ref<LocalOrderItem[]>([]);
const barcode = ref('');
const inputFocus = ref(true);
const showSummary = ref(false);

onLoad((options?: Record<string, string>) => {
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

async function initPage(): Promise<void> {
  await loadOrder();
  await loadScanItems();
}

async function loadOrder(): Promise<void> {
  const orders = await getLocalOrders();
  order.value = orders.find(o => o.id === orderId.value) || null;
}

async function loadScanItems(): Promise<void> {
  scanItems.value = await getScanItems(orderId.value);
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

  try {
    matchBarcodeSync(code);
  } catch (e) {
    uni.showToast({ title: (e as Error).message, icon: 'none', duration: 600 });
  }

  barcode.value = '';
  focusScannerInput();
}

function getConfirmBarcode(event?: BarcodeConfirmEvent): string {
  return (event?.detail?.value ?? barcode.value).trim();
}

function focusScannerInput(): void {
  nextTick(() => {
    inputFocus.value = true;
  });
}

// 直接从内存缓存查库存/验重/maxSeq，零 Storage IO
function getCachedInventory(rollCode: string): { inv: InventoryRow; idx: number } | null {
  const list: InventoryRow[] = uni.getStorageSync('acrylic_local_inventory') || [];
  const idx = list.findIndex(row => row.roll_code === rollCode);
  if (idx < 0 || list[idx].status !== 'available') return null;
  return { inv: list[idx], idx };
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

  // 9. 同步更新库存 + 异步写 Storage（后台执行，不阻塞下一次扫码）
  const invList: InventoryRow[] = uni.getStorageSync('acrylic_local_inventory') || [];
  const invIdx = invList.findIndex(r => r.roll_code === rollCode);
  if (invIdx >= 0) { invList[invIdx].status = 'shipped'; uni.setStorageSync('acrylic_local_inventory', invList); }
  saveScanItem(item);

  // 静默成功，不弹 Toast 干扰连续扫码
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

  // 恢复库存（内存）
  const invList: InventoryRow[] = uni.getStorageSync('acrylic_local_inventory') || [];
  const idx = invList.findIndex(row => row.roll_code === item.roll_code);
  if (idx >= 0) {
    invList[idx].status = 'available';
    uni.setStorageSync('acrylic_local_inventory', invList);
  }

  // 后台异步写 Storage
  delScanItem(item.client_item_id);

  uni.showToast({ title: '已删除', icon: 'success' });
}

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
  const unsynced = scanItems.value.filter(it => it.synced === 0 && it.status === 'active');
  if (!unsynced.length) {
    uni.showToast({ title: '没有可提交的扫码记录', icon: 'none' });
    return;
  }

  const confirmText = overPlanned.value
    ? `已超发 ${overCount.value} 件，确认提交？`
    : `确认提交 ${unsynced.length} 条扫码记录？`;

  const { confirm } = await uni.showModal({
    title: '提交确认',
    content: confirmText,
  });
  if (!confirm) return;

  try {
    const result = await submitOrderItems(orderId.value, unsynced);
    await markScanItemsSynced(unsynced.map(it => it.client_item_id));
    await loadScanItems();

    let msg = '提交成功';
    if (result.overPlanned) msg += `（超发 ${result.overCount} 件）`;
    uni.showToast({ title: msg, icon: 'success' });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '提交失败', icon: 'none' });
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
  font-size: 36rpx;
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
  height: 56rpx;
  line-height: 56rpx;
  padding: 0 20rpx;
  font-size: 26rpx;
  border-radius: 8rpx;
}

.submit-btn {
  font-weight: 700;
}

.card {
  margin: 16rpx 24rpx;
  padding: 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.card-row {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  font-size: 26rpx;
}

.label {
  color: #6b7280;
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
  height: 8rpx;
  margin: 0 24rpx 16rpx;
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
  color: #9ca3af;
  font-size: 26rpx;
}

.scan-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
  padding: 18rpx 20rpx;
  border-radius: 8rpx;
  background: #ffffff;
  border-left: 6rpx solid #1677ff;
}

.scan-item.deleted {
  border-left-color: #d1d5db;
  opacity: 0.5;
}

.scan-item-left {
  display: flex;
  flex-direction: column;
}

.scan-code {
  font-size: 28rpx;
  color: #1f2329;
  font-weight: 600;
}

.scan-meta {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #6b7280;
}

.scan-item-right {
  padding: 4rpx 12rpx;
}

.delete-btn {
  font-size: 36rpx;
  color: #e74c3c;
  font-weight: 700;
}

.bottom-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx 32rpx;
  background: #ffffff;
  border-top: 1px solid #eef0f4;
}

.barcode-input {
  flex: 1;
  height: 76rpx;
  padding: 0 20rpx;
  border: 1px solid #d9dee8;
  border-radius: 8rpx;
  background: #f6f7f9;
  font-size: 28rpx;
}

.btn-confirm,
.btn-camera {
  margin: 0;
  height: 76rpx;
  padding: 0 28rpx;
  line-height: 76rpx;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.btn-confirm {
  background: #1677ff;
  color: #ffffff;
}

.btn-camera {
  background: #f0f2f5;
  color: #1f2329;
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
  width: 640rpx;
  max-height: 80vh;
  border-radius: 16rpx;
  background: #ffffff;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1px solid #eef0f4;
}

.popup-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2329;
}

.popup-close {
  font-size: 40rpx;
  color: #9ca3af;
}

.popup-body {
  padding: 24rpx 32rpx 32rpx;
  max-height: 55vh;
  overflow-y: auto;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 12rpx 0;
  font-size: 26rpx;
  color: #1f2329;
}

.divider {
  height: 1px;
  margin: 16rpx 0;
  background: #eef0f4;
}

.product-stat {
  padding: 14rpx 0;
  border-bottom: 1px solid #f6f7f9;
}

.ps-code {
  display: block;
  font-size: 26rpx;
  color: #1f2329;
  font-weight: 600;
}

.ps-qty {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.ps-diff {
  display: block;
  margin-top: 2rpx;
  font-size: 24rpx;
}
</style>
