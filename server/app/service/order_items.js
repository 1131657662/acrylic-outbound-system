'use strict';

const { Service } = require('egg');

class OrderItemsService extends Service {
  async delete(itemId) {
    return await this.app.mysql.beginTransactionScope(async conn => {
      const item = await conn.get('order_items', { id: Number(itemId), status: 'active' });
      if (!item) this.ctx.throw(404, '出库记录不存在');
      await this.requireEditableOrder(conn, item.order_id);
      await conn.update('order_items', {
        id: item.id,
        status: 'deleted',
        deleted_at: this.app.mysql.literals.now,
      });
      await this.restoreInventory(conn, item);
      return { id: item.id, status: 'deleted' };
    }, this.ctx);
  }

  async requireEditableOrder(conn, orderId) {
    const order = await conn.get('orders', { id: orderId });
    if (!order) this.ctx.throw(404, '订单不存在');
    if (order.status !== 'scanning') this.ctx.throw(409, '只有扫码中订单可以作废出库记录');
  }

  async restoreInventory(conn, item) {
    const existed = await conn.get('inventory', { roll_code: item.roll_code });
    if (existed) {
      await conn.update('inventory', { id: existed.id, status: 'available', shipped_order_id: null, shipped_at: null });
      return;
    }
    await conn.insert('inventory', {
      roll_code: item.roll_code,
      model: item.model,
      weight: item.weight,
      product_code: item.product_code,
      status: 'available',
    });
  }
}

module.exports = OrderItemsService;
