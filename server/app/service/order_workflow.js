'use strict';

const { Service } = require('egg');
const { positiveInteger, requiredString } = require('../utils/validators');

class OrderWorkflowService extends Service {
  async cancel(orderId) {
    return await this.updateStatus(orderId, [ 'pending' ], 'cancelled');
  }

  async revert(orderId) {
    return await this.app.mysql.beginTransactionScope(async conn => {
      const order = await this.requireOrderStatus(conn, orderId, [ 'completed' ]);
      const completedAt = new Date(order.completed_at).getTime();
      if (Date.now() - completedAt > 7 * 24 * 60 * 60 * 1000) {
        this.ctx.throw(409, '订单完成超过 7 天，禁止回退');
      }
      const items = await conn.select('order_items', { where: { order_id: order.id, status: 'active' } });
      for (const item of items) await this.restoreInventory(conn, item);
      await conn.update('orders', { id: order.id, status: 'scanning', completed_at: null });
      return { id: order.id, status: 'scanning' };
    }, this.ctx);
  }

  async lock(orderId, payload, user) {
    if (!requiredString(payload.deviceId)) this.ctx.throw(400, '缺少设备 ID');
    return await this.app.mysql.beginTransactionScope(async conn => {
      const order = await this.requireOrderStatus(conn, orderId, [ 'pending', 'scanning' ]);
      this.assertLockAvailable(order, payload.deviceId, user.username);
      await conn.update('orders', this.lockRow(order.id, payload.deviceId, user.username));
      return { id: order.id, locked: true };
    }, this.ctx);
  }

  async unlock(orderId, payload, user) {
    return await this.app.mysql.beginTransactionScope(async conn => {
      const order = await conn.get('orders', { id: orderId });
      if (!order) this.ctx.throw(404, '订单不存在');
      if (!this.canUnlock(order, payload.deviceId, user.username)) this.ctx.throw(403, '无权释放该锁');
      await conn.update('orders', { id: order.id, locked_by_user: null, locked_by_device: null, locked_at: null });
      return { id: order.id, locked: false };
    }, this.ctx);
  }

  async updateStatus(orderId, allowed, status) {
    return await this.app.mysql.beginTransactionScope(async conn => {
      const order = await this.requireOrderStatus(conn, orderId, allowed);
      await conn.update('orders', { id: order.id, status });
      return { id: order.id, status };
    }, this.ctx);
  }

  async requireOrderStatus(conn, orderId, allowed) {
    if (!positiveInteger(Number(orderId))) this.ctx.throw(400, '订单 ID 错误');
    const order = await conn.get('orders', { id: Number(orderId) });
    if (!order) this.ctx.throw(404, '订单不存在');
    if (!allowed.includes(order.status)) this.ctx.throw(409, '订单状态不允许操作');
    return order;
  }

  async restoreInventory(conn, item) {
    const existed = await conn.get('inventory', { roll_code: item.roll_code });
    if (existed) {
      await conn.update('inventory', { id: existed.id, status: 'available', shipped_order_id: null, shipped_at: null });
      return;
    }
    await conn.insert('inventory', this.inventoryRow(item));
  }

  inventoryRow(item) {
    return {
      roll_code: item.roll_code,
      model: item.model,
      weight: item.weight,
      product_code: item.product_code,
      status: 'available',
    };
  }

  assertLockAvailable(order, deviceId, username) {
    if (!order.locked_at) return;
    if (order.locked_by_device === deviceId && order.locked_by_user === username) return;
    if (Date.now() - new Date(order.locked_at).getTime() > 2 * 60 * 60 * 1000) return;
    this.ctx.throw(409, '订单已被其他设备锁定');
  }

  lockRow(id, deviceId, username) {
    return { id, status: 'scanning', locked_by_user: username, locked_by_device: deviceId, locked_at: this.app.mysql.literals.now };
  }

  canUnlock(order, deviceId, username) {
    return !order.locked_by_user || order.locked_by_user === username || order.locked_by_device === deviceId;
  }
}

module.exports = OrderWorkflowService;
