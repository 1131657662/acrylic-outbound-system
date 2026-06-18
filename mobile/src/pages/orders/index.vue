<template>
  <NetworkBar />
  <view class="page">
    <view class="header">
      <view>
        <text class="title">订单</text>
        <text class="hint">待扫码 / 扫码中</text>
      </view>
      <view class="header-btns">
        <button class="header-btn" size="mini" :loading="syncing" @click="handleSync">同步</button>
        <button class="header-btn add-btn" size="mini" @click="goCreate">+</button>
      </view>
    </view>

    <!-- 搜索栏 -->
    <view class="search-bar">
      <input v-model="searchKeyword" class="search-input" placeholder="搜索订单号或车牌号" />
    </view>

    <view v-if="filteredOrders.length === 0" class="empty">
      <text class="empty-icon">📦</text>
      <text class="empty-title">暂无订单</text>
      <text class="empty-hint">点击右上角「同步」获取订单</text>
    </view>

    <view v-for="order in filteredOrders" :key="order.id" class="order-card"
      :style="{ borderLeftColor: statusColor[order.status] }" @click="goScan(order)">
      <view class="order-row">
        <text class="order-no">{{ order.order_no }}</text>
        <text class="status" :class="'status-' + order.status">{{ statusText[order.status] }}</text>
      </view>
      <view class="meta-row">
        <text>车牌：{{ order.vehicle_no }}</text>
        <text>计划：{{ order.total_planned_qty }} 件</text>
      </view>
      <view class="plan-list">
        <text v-for="plan in order.plans || []" :key="plan.id" class="plan-item">
          {{ plan.product_code }} {{ plan.model }} x {{ plan.planned_qty }}
        </text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app';
import NetworkBar from '../../components/NetworkBar.vue';
import { localOrders } from '../../services/orders';
import { syncAll } from '../../services/sync';
import type { OrderRow } from '../../types';
import { getToken } from '../../utils/storage';

const orders = ref<OrderRow[]>([]);
const syncing = ref(false);
const searchKeyword = ref('');
const statusText: Record<OrderRow['status'], string> = {
  pending: '待扫码',
  scanning: '扫码中',
  completed: '已完成',
  cancelled: '已取消',
};
const statusColor: Record<string, string> = {
  pending:   '#fa8c16',
  scanning:  '#1677ff',
  completed: '#52c41a',
  cancelled: '#9ca3af',
};

const filteredOrders = computed(() => {
  if (!searchKeyword.value) return orders.value;
  const kw = searchKeyword.value.toLowerCase();
  return orders.value.filter(o =>
    o.order_no.toLowerCase().includes(kw) ||
    o.vehicle_no.toLowerCase().includes(kw)
  );
});

onShow(() => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/index' });
    return;
  }
  loadOrders();
});

onPullDownRefresh(async () => {
  await handleSync();         // handleSync 内部已调用 loadOrders()
  uni.stopPullDownRefresh();
});

function goCreate(): void {
  uni.navigateTo({ url: '/pages/orders/create' });
}

function goScan(order: OrderRow): void {
  uni.navigateTo({ url: `/pages/orders/scan?id=${order.id}` });
}

async function loadOrders(): Promise<void> {
  orders.value = await localOrders();
}

async function handleSync(): Promise<void> {
  syncing.value = true;
  try {
    const result = await syncAll();
    await loadOrders();
    uni.showToast({ title: `同步 ${result.orderCount} 个订单`, icon: 'none' });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '同步失败', icon: 'none' });
  } finally {
    syncing.value = false;
  }
}
</script>

<style>
.page {
  padding: 24rpx;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
}

.hint {
  display: block;
  margin-top: 8rpx;
  color: #6b7280;
  font-size: 26rpx;
}

.header-btns {
  display: flex;
  gap: 12rpx;
}

.header-btn {
  margin: 0;
}

.add-btn {
  background: #1677ff;
  color: #ffffff;
  font-weight: 700;
  font-size: 32rpx;
  width: 72rpx;
  height: 64rpx;
  line-height: 64rpx;
  padding: 0;
}

/* 搜索栏 */
.search-bar {
  padding: 0 0 16rpx;
}
.search-input {
  height: 64rpx;
  padding: 0 20rpx;
  border: 1px solid #d9dee8;
  border-radius: 8rpx;
  background: #ffffff;
  font-size: 26rpx;
}

/* 空状态 */
.empty {
  padding: 96rpx 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
  text-align: center;
}
.empty-icon {
  display: block;
  font-size: 64rpx;
  margin-bottom: 16rpx;
}
.empty-title {
  display: block;
  font-size: 30rpx;
  color: #1f2329;
  font-weight: 600;
  margin-bottom: 8rpx;
}
.empty-hint {
  font-size: 26rpx;
  color: #6b7280;
}

/* 订单卡片 */
.order-card {
  margin-bottom: 14rpx;
  padding: 20rpx;
  border-radius: 12rpx;
  background: #ffffff;
  border-left: 3rpx solid transparent;
}

.order-row,
.meta-row {
  display: flex;
  justify-content: space-between;
}

.order-no {
  color: #111827;
  font-size: 32rpx;
  font-weight: 700;
}

.status {
  font-size: 26rpx;
}
.status-pending   { color: #fa8c16; }
.status-scanning  { color: #1677ff; }
.status-completed { color: #52c41a; }
.status-cancelled { color: #9ca3af; }

.meta-row {
  margin-top: 18rpx;
  color: #4b5563;
  font-size: 28rpx;
}

.plan-list {
  margin-top: 16rpx;
}

.plan-item {
  display: block;
  margin-top: 8rpx;
  color: #6b7280;
  font-size: 26rpx;
}
</style>
