<template>
  <view class="page">
    <view class="top-bar" :style="{ paddingTop: (16 + statusBarHeight) + 'px' }">
      <text class="back-icon" @click="goBack">←</text>
      <text class="top-title">创建订单</text>
      <text></text>
    </view>
    <scroll-view class="form-scroll" scroll-y>
      <view class="form-card">
        <view class="field">
          <text class="label">客户名称</text>
          <input v-model="form.customerName" class="input" placeholder="请输入客户名称" />
        </view>
        <view class="field">
          <text class="label">车牌号 <text class="required">*</text></text>
          <input v-model="form.vehicleNo" class="input"
            :class="{ 'input-error': fieldErrors.vehicleNo }"
            @input="delete fieldErrors.vehicleNo"
            placeholder="请输入车牌号" />
        </view>
      </view>

      <view class="form-card" v-for="(plan, index) in form.plans" :key="index">
        <view class="plan-header">
          <text class="plan-title">产品明细 {{ index + 1 }}</text>
          <text class="delete-btn" @click="removePlan(index)" v-if="form.plans.length > 1">删除</text>
        </view>
        <view class="field">
          <text class="label">产品代码 <text class="required">*</text></text>
          <input v-model="plan.productCode" class="input"
            :class="{ 'input-error': fieldErrors['plan_' + index + '_code'] }"
            @input="delete fieldErrors['plan_' + index + '_code']"
            placeholder="条码前3位，如 ABC" />
        </view>
        <view class="field">
          <text class="label">计划件数 <text class="required">*</text></text>
          <input v-model="plan.plannedQty" class="input"
            :class="{ 'input-error': fieldErrors['plan_' + index + '_qty'] }"
            @input="delete fieldErrors['plan_' + index + '_qty']"
            type="number" placeholder="请输入件数" />
        </view>
      </view>

      <view class="add-plan">
        <button size="mini" type="default" @click="addPlan">+ 添加产品明细</button>
      </view>
    </scroll-view>
    <view class="submit-area">
      <button type="primary" :loading="submitting" @click="handleSubmit">保存订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import type { OrderRow, OrderPlan } from '../../types';
import { getUser } from '../../utils/storage';

interface PlanForm {
  productCode: string;
  plannedQty: string;
}

interface OrderForm {
  customerName: string;
  vehicleNo: string;
  plans: PlanForm[];
}

const form = reactive<OrderForm>({
  customerName: '',
  vehicleNo: '',
  plans: [{ productCode: '', plannedQty: '' }],
});
const submitting = ref(false);
const fieldErrors = reactive<Record<string, string>>({});
const statusBarHeight = ref(0);

// 安全区
try {
  statusBarHeight.value = uni.getSystemInfoSync().statusBarHeight || 0;
} catch { /* ignore */ }

function addPlan(): void {
  form.plans.push({ productCode: '', plannedQty: '' });
}

function removePlan(index: number): void {
  if (form.plans.length <= 1) return;
  uni.showModal({
    title: '确认删除',
    content: `确定删除产品明细 ${index + 1}？`,
    success: (res) => {
      if (!res.confirm) return;
      // 清理 fieldErrors
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

function goBack(): void {
  uni.navigateBack();
}

function generateLocalOrderNo(): string {
  return 'LOCAL_' + Date.now().toString(36).toUpperCase();
}

async function handleSubmit(): Promise<void> {
  // 清空错误
  Object.keys(fieldErrors).forEach(k => delete fieldErrors[k]);

  if (!form.vehicleNo.trim()) {
    fieldErrors.vehicleNo = '请输入车牌号';
    uni.showToast({ title: '请输入车牌号', icon: 'none' });
    return;
  }

  for (let i = 0; i < form.plans.length; i++) {
    const p = form.plans[i];
    if (!p.productCode.trim()) {
      fieldErrors[`plan_${i}_code`] = '产品代码必填';
      uni.showToast({ title: `明细 ${i + 1} 产品代码必填`, icon: 'none' });
      return;
    }
    const qty = parseInt(p.plannedQty);
    if (!qty || qty <= 0) {
      fieldErrors[`plan_${i}_qty`] = '件数必须大于0';
      uni.showToast({ title: `明细 ${i + 1} 计划件数必须大于0`, icon: 'none' });
      return;
    }
  }

  submitting.value = true;
  try {
    const user = getUser();
    const orderNo = generateLocalOrderNo();
    const plans: OrderPlan[] = form.plans.map(p => ({
      id: 0,
      order_id: 0,
      product_code: p.productCode.trim(),
      model: '',
      planned_qty: parseInt(p.plannedQty),
      planned_weight: 0,
      remark: null,
    }));

    const totalQty = plans.reduce((sum, p) => sum + p.planned_qty, 0);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const order: OrderRow = {
      id: -Date.now(),
      order_no: orderNo,
      vehicle_no: form.vehicleNo.trim(),
      total_planned_qty: totalQty,
      total_planned_weight: 0,
      status: 'pending',
      created_at: now,
      plans,
    };

    const orders: OrderRow[] = uni.getStorageSync('acrylic_local_orders') || [];
    orders.unshift(order);
    uni.setStorageSync('acrylic_local_orders', orders);

    uni.showToast({ title: '订单已保存：' + orderNo, icon: 'success' });
    setTimeout(() => uni.navigateBack(), 800);
  } finally {
    submitting.value = false;
  }
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
  margin-bottom: 24rpx;
  padding: 16rpx 24rpx;
  background: #ffffff;
  border-bottom: 1px solid #eef0f4;
}

.back-icon {
  color: #1677ff;
  font-size: 44rpx;
  font-weight: 700;
}

.top-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2329;
}

.form-scroll {
  flex: 1;
  min-height: 0;
  padding: 24rpx;
  overflow-y: auto;
}

.form-card {
  margin-bottom: 20rpx;
  padding: 24rpx 20rpx;
  border-radius: 12rpx;
  background: #ffffff;
}

.field {
  margin-bottom: 24rpx;
}

.field:last-child {
  margin-bottom: 0;
}

.label {
  display: block;
  margin-bottom: 10rpx;
  color: #4b5563;
  font-size: 28rpx;
}

.required {
  color: #e74c3c;
}

.input {
  height: 88rpx;
  padding: 0 20rpx;
  border: 1px solid #d9dee8;
  border-radius: 8rpx;
  background: #ffffff;
  font-size: 30rpx;
}

.input-error {
  border-color: #e74c3c !important;
}

.plan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1px solid #eef0f4;
}

.plan-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2329;
}

.delete-btn {
  font-size: 28rpx;
  color: #e74c3c;
}

.add-plan {
  margin-bottom: 32rpx;
  text-align: center;
}

.submit-area {
  flex-shrink: 0;
  padding: 16rpx 24rpx 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom, 0px));
  background: #ffffff;
  border-top: 1px solid #eef0f4;
}

button[type="primary"] {
  height: 88rpx;
}
</style>
