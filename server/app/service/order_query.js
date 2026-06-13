'use strict';

const { Service } = require('egg');
const { positiveInteger } = require('../utils/validators');

class OrderQueryService extends Service {
  async all() {
    const orders = await this.app.mysql.query(
      'SELECT * FROM orders ORDER BY created_at DESC'
    );
    return await Promise.all(orders.map(order => this.withPlans(order)));
  }

  async pending() {
    const orders = await this.app.mysql.query(
      'SELECT * FROM orders WHERE status IN (?, ?) ORDER BY created_at DESC',
      [ 'pending', 'scanning' ]
    );
    return await Promise.all(orders.map(order => this.withPlans(order)));
  }

  async detail(orderId) {
    if (!positiveInteger(orderId)) this.ctx.throw(400, '订单 ID 错误');
    const order = await this.app.mysql.get('orders', { id: orderId });
    if (!order) this.ctx.throw(404, '订单不存在');
    return { ...await this.withPlans(order), items: await this.items(order.id) };
  }

  async withPlans(order) {
    const plans = await this.app.mysql.select('order_plans', {
      where: { order_id: order.id },
      orders: [[ 'id', 'asc' ]],
    });
    return { ...order, plans };
  }

  async items(orderId) {
    return await this.app.mysql.select('order_items', {
      where: { order_id: orderId, status: 'active' },
      orders: [[ 'scan_seq', 'asc' ]],
    });
  }
}

module.exports = OrderQueryService;
