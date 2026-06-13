'use strict';

const { Service } = require('egg');

class OrderLocalService extends Service {
  async sync(payload) {
    const result = await this.ctx.service.orderCreate.create(payload);
    return {
      localOrderNo: payload.localOrderNo || null,
      id: result.id,
      orderNo: result.orderNo,
      syncStatus: 'synced',
    };
  }
}

module.exports = OrderLocalService;
