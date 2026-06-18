'use strict';

module.exports = appInfo => {
  const config = {};

  config.keys = `${appInfo.name}_change_me`;

  config.security = {
    csrf: { enable: false },
  };

  config.middleware = [ 'cors' ];

  config.corsAllowlist = [
    process.env.CORS_ORIGIN || 'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
  ];

  config.jwt = {
    secret: process.env.JWT_SECRET || 'dev_only_change_me',
    expiresIn: '12h',
  };

  config.bodyParser = {
    enable: true,
    jsonLimit: '1mb',
    formLimit: '1mb',
    json: { strict: false },
  };

  config.mysql = {
    client: {
      host: process.env.DB_HOST || '127.0.0.1',
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'acrylic_scan',
    },
    app: true,
    agent: false,
  };

  return config;
};
