'use strict';

const { Service } = require('egg');
const { requiredString, positiveInteger } = require('../utils/validators');

class OrderSubmitService extends Service {
  async submit(payload, user) {
    this.validate(payload);
    return await this.app.mysql.beginTransactionScope(async conn => {
      const order = await this.getSubmittableOrder(conn, payload.orderId);
      await this.insertItems(conn, payload.items, order, user);
      const [{ total }] = await conn.query(
        'SELECT COUNT(*) as total FROM order_items WHERE order_id = ? AND status = ?',
        [ order.id, 'active' ]
      );
      const overCount = total - order.total_planned_qty;
      await conn.update('orders', {
        id: order.id,
        status: 'completed',
        completed_at: this.app.mysql.literals.now,
      });
      return {
        orderId: order.id,
        status: 'completed',
        totalScanned: total,
        overPlanned: overCount > 0,
        overCount: overCount > 0 ? overCount : 0,
      };
    }, this.ctx);
  }

  validate(payload) {
    if (!positiveInteger(payload.orderId) || !Array.isArray(payload.items)) {
      this.ctx.throw(400, '提交参数错误');
    }
    if (!payload.items.length) this.ctx.throw(400, '没有可提交的扫码记录');
  }

  async getSubmittableOrder(conn, orderId) {
    const order = await conn.get('orders', { id: orderId });
    if (!order || ![ 'pending', 'scanning' ].includes(order.status)) {
      this.ctx.throw(409, '订单状态不允许提交');
    }
    return order;
  }

  async insertItems(conn, items, order, user) {
    let inserted = 0;
    for (const item of items) {
      if (await this.insertOne(conn, item, order, user)) {
        inserted++;
      }
    }
    return inserted;
  }

  async insertOne(conn, item, order, user) {
    this.validateItem(item);
    if (await conn.get('order_items', { client_item_id: item.clientItemId })) return false;
    const inventory = await this.availableInventory(conn, item.rollCode);
    const plan = await this.matchPlan(conn, order.id, inventory.product_code);
    await this.ensureNotDuplicated(conn, order.id, item.rollCode);
    await conn.insert('order_items', this.itemRow(item, order, plan, inventory, user));
    await conn.update('inventory', this.shippedInventory(inventory.id, order.id));
    return true;
  }

  validateItem(item) {
    if (!requiredString(item.clientItemId) || !requiredString(item.rollCode)) {
      this.ctx.throw(400, '扫码记录缺少条码或幂等 ID');
    }
    if (!positiveInteger(item.scanSeq)) this.ctx.throw(400, '扫码顺序号错误');
  }

  async availableInventory(conn, rollCode) {
    const inventory = await conn.get('inventory', { roll_code: rollCode, status: 'available' });
    if (!inventory) this.ctx.throw(409, `条码 ${rollCode} 不存在或已出库`);
    return inventory;
  }

  async matchPlan(conn, orderId, productCode) {
    const plan = await conn.get('order_plans', { order_id: orderId, product_code: productCode });
    if (!plan) this.ctx.throw(409, `产品代码 ${productCode} 不属于本订单`);
    return plan;
  }

  async ensureNotDuplicated(conn, orderId, rollCode) {
    const existed = await conn.get('order_items', { order_id: orderId, roll_code: rollCode, status: 'active' });
    if (existed) this.ctx.throw(409, `条码 ${rollCode} 已在本订单出库过`);
  }

  itemRow(item, order, plan, inventory, user) {
    return {
      client_item_id: item.clientItemId,
      order_id: order.id,
      order_plan_id: plan.id,
      product_code: inventory.product_code,
      model: inventory.model,
      roll_code: inventory.roll_code,
      weight: inventory.weight,
      operator: user.username,
      device_id: item.deviceId || null,
      scan_seq: item.scanSeq,
      scanned_at: item.scannedAt || this.app.mysql.literals.now,
      status: 'active',
    };
  }

  shippedInventory(id, orderId) {
    return { id, status: 'shipped', shipped_order_id: orderId, shipped_at: this.app.mysql.literals.now };
  }
}

module.exports = OrderSubmitService;
