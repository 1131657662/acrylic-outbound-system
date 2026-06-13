'use strict';

const { Service } = require('egg');
const { createOrderNo } = require('../utils/order_no');
const { requiredString, positiveInteger } = require('../utils/validators');
const { totalQty, totalWeight } = require('../utils/plan_stats');

class OrderCreateService extends Service {
  async create(payload) {
    this.validate(payload);
    const plans = await this.buildPlans(payload.plans);

    return await this.app.mysql.beginTransactionScope(async conn => {
      const orderNo = await this.nextOrderNo(conn);
      const orderResult = await conn.insert('orders', {
        order_no: orderNo,
        customer_name: 'N/A',
        vehicle_no: payload.vehicleNo.trim(),
        total_planned_qty: totalQty(plans),
        total_planned_weight: totalWeight(plans),
        status: 'pending',
      });
      await this.insertPlans(conn, orderResult.insertId, plans);
      return { id: orderResult.insertId, orderNo };
    }, this.ctx);
  }

  validate(payload) {
    if (!requiredString(payload.vehicleNo)) {
      this.ctx.throw(400, '车牌号必填');
    }
    if (!Array.isArray(payload.plans) || !payload.plans.length) {
      this.ctx.throw(400, '至少添加一条计划明细');
    }
  }

  async buildPlans(rawPlans) {
    const plans = [];
    for (const item of rawPlans) {
      if (!requiredString(item.productCode) || !positiveInteger(item.plannedQty)) {
        this.ctx.throw(400, '计划明细格式错误');
      }
      plans.push(await this.buildPlan(item));
    }
    return plans;
  }

  async buildPlan(item) {
    const rows = await this.app.mysql.query(
      'SELECT model, AVG(weight) avg_weight FROM inventory WHERE product_code = ? AND status = ? GROUP BY model LIMIT 1',
      [ item.productCode.trim(), 'available' ]
    );
    if (!rows.length) this.ctx.throw(400, `产品代码 ${item.productCode} 无可用库存`);
    return {
      product_code: item.productCode.trim(),
      model: rows[0].model,
      planned_qty: item.plannedQty,
      planned_weight: Number(rows[0].avg_weight) * item.plannedQty,
      remark: item.remark || null,
    };
  }

  async nextOrderNo(conn) {
    const rows = await conn.query(
      'SELECT COUNT(*) count FROM orders WHERE DATE(created_at) = CURRENT_DATE'
    );
    return createOrderNo(Number(rows[0].count) + 1);
  }

  async insertPlans(conn, orderId, plans) {
    await conn.insert('order_plans', plans.map(plan => ({ ...plan, order_id: orderId })));
  }
}

module.exports = OrderCreateService;
