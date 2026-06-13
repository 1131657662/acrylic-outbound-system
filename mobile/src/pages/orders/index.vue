<template>
  <view class="page">
    <view class="header">
      <view>
        <text class="title">订单</text>
        <text class="hint">仅显示待扫码和扫码中的订单</text>
      </view>
      <button class="sync-button" size="mini" :loading="syncing" @click="handleSync">同步</button>
    </view>

    <view v-if="orders.length === 0" class="empty">
      <text>暂无本地订单，请先同步数据</text>
    </view>

    <view v-for="order in orders" :key="order.id" class="order-card" @click="goScan(order)">
      <view class="order-row">
        <text class="order-no">{{ order.order_no }}</text>
        <text class="status">{{ statusText[order.status] }}</text>
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
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { localOrders } from '../../services/orders';
import { syncAll } from '../../services/sync';
import type { OrderRow } from '../../types';
import { getToken } from '../../utils/storage';

const orders = ref<OrderRow[]>([]);
const syncing = ref(false);
const statusText: Record<OrderRow['status'], string> = {
  pending: '待扫码',
  scanning: '扫码中',
  completed: '已完成',
  cancelled: '已取消',
};

onShow(() => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/index' });
    return;
  }
  loadOrders();
});

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
  font-size: 36rpx;
  font-weight: 600;
}

.hint {
  display: block;
  margin-top: 8rpx;
  color: #666;
  font-size: 24rpx;
}

.sync-button {
  margin: 0;
}

.empty {
  padding: 48rpx 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
  color: #6b7280;
  text-align: center;
}

.order-card {
  margin-bottom: 20rpx;
  padding: 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.order-row,
.meta-row {
  display: flex;
  justify-content: space-between;
}

.order-no {
  color: #111827;
  font-size: 30rpx;
  font-weight: 700;
}

.status {
  color: #1677ff;
  font-size: 24rpx;
}

.meta-row {
  margin-top: 18rpx;
  color: #4b5563;
  font-size: 26rpx;
}

.plan-list {
  margin-top: 16rpx;
}

.plan-item {
  display: block;
  margin-top: 8rpx;
  color: #6b7280;
  font-size: 24rpx;
}
</style>
