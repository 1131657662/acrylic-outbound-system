<template>
  <view class="page">
    <view class="panel">
      <text class="title">腈纶出库扫码系统</text>
      <text class="subtitle">登录后同步订单和库存</text>

      <view class="field">
        <text class="label">服务器地址</text>
        <input v-model="form.apiBase" class="input" placeholder="http://电脑IP:7001/api" />
      </view>
      <view class="field">
        <text class="label">账号</text>
        <input v-model="form.username" class="input" placeholder="请输入账号" />
      </view>
      <view class="field">
        <text class="label">密码</text>
        <input v-model="form.password" class="input" password placeholder="请输入密码" />
      </view>

      <button type="primary" :loading="loading" @click="handleLogin">登录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { login } from '../../services/auth';
import { getApiBase, getToken } from '../../utils/storage';

const loading = ref(false);
const form = reactive({
  apiBase: getApiBase(),
  username: 'admin',
  password: 'Admin@123456',
});

onMounted(() => {
  if (getToken()) uni.switchTab({ url: '/pages/orders/index' });
});

async function handleLogin(): Promise<void> {
  if (!form.apiBase || !form.username || !form.password) {
    uni.showToast({ title: '请填写完整登录信息', icon: 'none' });
    return;
  }
  loading.value = true;
  try {
    await login(form);
    uni.switchTab({ url: '/pages/orders/index' });
  } catch (error) {
    uni.showToast({ title: error instanceof Error ? error.message : '登录失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
}
</script>

<style>
.page {
  min-height: 100vh;
  padding: 72rpx 32rpx;
  background: #f6f7f9;
}

.panel {
  padding: 36rpx 28rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.title {
  display: block;
  color: #1f2329;
  font-size: 40rpx;
  font-weight: 700;
}

.subtitle {
  display: block;
  margin-top: 12rpx;
  margin-bottom: 36rpx;
  color: #6b7280;
  font-size: 26rpx;
}

.field {
  margin-bottom: 24rpx;
}

.label {
  display: block;
  margin-bottom: 10rpx;
  color: #374151;
  font-size: 26rpx;
}

.input {
  height: 88rpx;
  padding: 0 20rpx;
  border: 1px solid #d9dee8;
  border-radius: 8rpx;
  background: #ffffff;
}
</style>
