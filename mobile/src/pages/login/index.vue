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
        <view class="input-wrap">
          <input v-model="form.password" class="input" :password="!showPassword" placeholder="请输入密码" />
          <text class="pw-toggle" @click="showPassword = !showPassword">{{ showPassword ? '隐藏' : '显示' }}</text>
        </view>
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
const showPassword = ref(false);
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
  padding: 48rpx 28rpx;
  background: #f6f7f9;
}

.panel {
  padding: 32rpx 28rpx;
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
  font-size: 28rpx;
}

.field {
  margin-bottom: 24rpx;
}

.label {
  display: block;
  margin-bottom: 10rpx;
  color: #4b5563;
  font-size: 28rpx;
}

.input {
  height: 96rpx;
  padding: 0 20rpx;
  border: 1px solid #d9dee8;
  border-radius: 8rpx;
  background: #ffffff;
}

.input-wrap {
  position: relative;
}

.pw-toggle {
  position: absolute;
  right: 20rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 26rpx;
  color: #1677ff;
  padding: 12rpx;
}

button[type="primary"] {
  height: 88rpx;
}
</style>
