'use strict';

const { Controller } = require('egg');

class InventoryController extends Controller {
  async importSku() {
    const result = await this.ctx.service.inventory.importSku(
      this.ctx.request.body || {},
      this.ctx.state.user
    );
    this.ctx.body = result;
  }

  async sync() {
    this.ctx.body = await this.ctx.service.inventory.syncAvailable();
  }
}

module.exports = InventoryController;
