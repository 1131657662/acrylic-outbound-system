'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Service } = require('egg');
const { requiredString } = require('../utils/validators');

class AuthService extends Service {
  async login(payload) {
    if (!requiredString(payload.username) || !requiredString(payload.password)) {
      this.ctx.throw(400, '请输入账号和密码');
    }

    const user = await this.app.mysql.get('users', { username: payload.username.trim() });
    const valid = user && await bcrypt.compare(payload.password, user.password);
    if (!valid) this.ctx.throw(401, '账号或密码错误');

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      this.app.config.jwt.secret,
      { algorithm: 'HS256', expiresIn: this.app.config.jwt.expiresIn }
    );

    return {
      token,
      user: { id: user.id, username: user.username, name: user.name, role: user.role },
    };
  }
}

module.exports = AuthService;
