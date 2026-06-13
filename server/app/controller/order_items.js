'use strict';

const { Controller } = require('egg');

class OrderItemsController extends Controller {
  async delete() {
    this.ctx.body = await this.ctx.service.orderItems.delete(this.ctx.params.id);
  }
}

module.exports = OrderItemsController;
