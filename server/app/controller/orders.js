'use strict';

const { Controller } = require('egg');

class OrdersController extends Controller {
  async index() {
    this.ctx.body = await this.ctx.service.orderQuery.all();
  }

  async pending() {
    this.ctx.body = await this.ctx.service.orderQuery.pending();
  }

  async show() {
    this.ctx.body = await this.ctx.service.orderQuery.detail(Number(this.ctx.params.id));
  }

  async create() {
    this.ctx.body = await this.ctx.service.orderCreate.create(this.ctx.request.body || {});
  }

  async localSync() {
    this.ctx.body = await this.ctx.service.orderLocal.sync(this.ctx.request.body || {});
  }

  async submit() {
    this.ctx.body = await this.ctx.service.orderSubmit.submit(
      this.ctx.request.body || {},
      this.ctx.state.user
    );
  }

  async cancel() {
    this.ctx.body = await this.ctx.service.orderWorkflow.cancel(Number(this.ctx.params.id));
  }

  async revert() {
    this.ctx.body = await this.ctx.service.orderWorkflow.revert(Number(this.ctx.params.id));
  }

  async lock() {
    this.ctx.body = await this.ctx.service.orderWorkflow.lock(
      Number(this.ctx.params.id),
      this.ctx.request.body || {},
      this.ctx.state.user
    );
  }

  async unlock() {
    this.ctx.body = await this.ctx.service.orderWorkflow.unlock(
      Number(this.ctx.params.id),
      this.ctx.request.body || {},
      this.ctx.state.user
    );
  }

  async export() {
    const result = await this.ctx.service.orderExport.export(this.ctx.params.id);
    this.ctx.attachment(result.fileName);
    this.ctx.type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    this.ctx.body = result.buffer;
  }
}

module.exports = OrdersController;
