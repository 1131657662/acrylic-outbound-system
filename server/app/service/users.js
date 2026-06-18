'use strict';

const bcrypt = require('bcryptjs');
const { Service } = require('egg');
const { requiredString } = require('../utils/validators');

class UsersService extends Service {
  async list() {
    const users = await this.app.mysql.select('users', {
      columns: ['id', 'username', 'name', 'role', 'created_at'],
      orders: [['created_at', 'desc']],
    });
    return users;
  }

  async create(payload) {
    if (!requiredString(payload.username) || !requiredString(payload.password) || !requiredString(payload.name)) {
      this.ctx.throw(400, '用户名、密码和姓名不能为空');
    }

    const username = payload.username.trim();
    const existing = await this.app.mysql.get('users', { username });
    if (existing) this.ctx.throw(409, '用户名已存在');

    const role = payload.role === 'admin' ? 'admin' : 'operator';
    const hashedPassword = await bcrypt.hash(payload.password, 10);

    const result = await this.app.mysql.insert('users', {
      username,
      password: hashedPassword,
      name: payload.name.trim(),
      role,
    });

    return { id: result.insertId, username, name: payload.name.trim(), role };
  }

  async resetPassword(userId, payload) {
    if (!requiredString(payload.password)) {
      this.ctx.throw(400, '新密码不能为空');
    }

    const user = await this.app.mysql.get('users', { id: userId });
    if (!user) this.ctx.throw(404, '用户不存在');

    const hashedPassword = await bcrypt.hash(payload.password, 10);
    await this.app.mysql.update('users', {
      id: userId,
      password: hashedPassword,
    });

    return { message: '密码已重置' };
  }
}

module.exports = UsersService;
