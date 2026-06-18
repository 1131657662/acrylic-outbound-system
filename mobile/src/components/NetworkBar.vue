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
