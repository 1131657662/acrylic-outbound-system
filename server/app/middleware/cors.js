'use strict';

module.exports = () => {
  return async function cors(ctx, next) {
    const origin = ctx.get('origin');
    if (ctx.app.config.corsAllowlist.includes(origin)) {
      ctx.set('Access-Control-Allow-Origin', origin);
      ctx.set('Access-Control-Allow-Credentials', 'true');
    }
    ctx.set('Access-Control-Allow-Headers', 'Authorization,Content-Type');
    ctx.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');

    if (ctx.method === 'OPTIONS') {
      ctx.status = 204;
      return;
    }

    await next();
  };
};
