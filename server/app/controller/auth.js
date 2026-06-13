'use strict';

const { Controller } = require('egg');

class AuthController extends Controller {
  async login() {
    const result = await this.ctx.service.auth.login(this.ctx.request.body || {});
    this.ctx.body = result;
  }
}

module.exports = AuthController;
