<template>
  <view class="page">
    <text class="title">我的</text>
    <view class="panel">
      <view class="row">
        <text class="label">当前用户</text>
        <text>{{ userName }}</text>
      </view>
      <view class="row">
        <text class="label">服务器</text>
        <text class="value">{{ apiBase }}</text>
      </view>
      <view class="row">
        <text class="label">上次同步</text>
        <text>{{ summary?.syncedAt || '未同步' }}</text>
      </view>
      <view class="row">
        <text class="label">订单/库存</text>
        <text>{{ summary ? `${summary.orderCount} / ${summary.inventoryCount}` : '-' }}</text>
      </view>
    </view>
    <button type="primary" :loading="syncing" @click="handleSync">同步数据</button>
    <button class="logout" @click="handleLogout">退出登录</button>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app';
import { ref } from 'vue';
import { syncAll, type SyncResult } from '../../services/sync';
import { clearSession, getApiBase, getToken, getUser } from '../../utils/storage';
import { getSyncSummary } from '../../utils/local_db';

const syncing = ref(false);
const userName = ref('-');
const apiBase = ref(getApiBase());
const summary = ref<SyncResult | null>(null);

onShow(() => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/index' });
    return;
  }
  refreshInfo();
});

async function handleSync(): Promise<void> {
  syncing.value = true;
  try {
    summary.value = await syncAll();
    uni.showToast({ title: '同步完成', icon: 'success' });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '同步失败', icon: 'none' });
  } finally {
    syncing.value = false;
  }
}

function handleLogout(): void {
  clearSession();
  uni.reLaunch({ url: '/pages/login/index' });
}

function refreshInfo(): void {
  const user = getUser();
  userName.value = user?.name || user?.username || '-';
  apiBase.value = getApiBase();
  summary.value = getSyncSummary();
}
</script>

<style>
.page {
  padding: 24rpx;
}

.title {
  display: block;
  margin-bottom: 24rpx;
  font-size: 36rpx;
  font-weight: 600;
}

.panel {
  margin-bottom: 24rpx;
  padding: 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.row {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1px solid #eef0f4;
  color: #1f2329;
  font-size: 26rpx;
}

.row:last-child {
  border-bottom: 0;
}

.label {
  color: #6b7280;
}

.value {
  max-width: 440rpx;
  text-align: right;
  word-break: break-all;
}

.logout {
  margin-top: 20rpx;
}
</style>
