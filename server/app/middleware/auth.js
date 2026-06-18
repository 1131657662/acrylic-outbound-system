'use strict';

const jwt = require('jsonwebtoken');

module.exports = () => {
  return async function auth(ctx, next) {
    const header = ctx.get('authorization');
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!token) {
      ctx.status = 401;
      ctx.body = { message: 'Unauthorized' };
      return;
    }

    try {
      ctx.state.user = jwt.verify(token, ctx.app.config.jwt.secret, { algorithms: [ 'HS256' ] });
      await next();
    } catch (error) {
      ctx.status = 401;
      ctx.body = { message: 'Unauthorized' };
    }
  };
};

module.exports.adminOnly = () => {
  return async function adminOnly(ctx, next) {
    const user = ctx.state.user;
    if (!user || user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = { message: '需要管理员权限' };
      return;
    }
    await next();
  };
};
