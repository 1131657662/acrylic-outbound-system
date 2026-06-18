'use strict';

const { Controller } = require('egg');

class UsersController extends Controller {
  async index() {
    const result = await this.ctx.service.users.list();
    this.ctx.body = result;
  }

  async create() {
    const result = await this.ctx.service.users.create(this.ctx.request.body || {});
    this.ctx.body = result;
  }

  async resetPassword() {
    const { id } = this.ctx.params;
    const result = await this.ctx.service.users.resetPassword(id, this.ctx.request.body || {});
    this.ctx.body = result;
  }
}

module.exports = UsersController;
