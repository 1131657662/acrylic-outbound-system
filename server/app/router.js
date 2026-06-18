'use strict';

module.exports = app => {
  const { router, controller, middleware } = app;
  const auth = middleware.auth();
  const adminOnly = middleware.auth.adminOnly();

  // Public
  router.post('/api/auth/login', controller.auth.login);

  // Inventory
  router.post('/api/inventory/import', auth, adminOnly, controller.inventory.importSku);
  router.get('/api/inventory/sync', auth, controller.inventory.sync);
  router.get('/api/inventory', auth, controller.inventory.list);

  // Orders
  router.get('/api/orders', auth, controller.orders.index);
  router.get('/api/orders/pending', auth, controller.orders.pending);
  router.get('/api/orders/:id', auth, controller.orders.show);
  router.post('/api/orders/create', auth, controller.orders.create);
  router.post('/api/orders/local-sync', auth, controller.orders.localSync);
  router.post('/api/orders/submit', auth, controller.orders.submit);
  router.post('/api/orders/:id/cancel', auth, adminOnly, controller.orders.cancel);
  router.post('/api/orders/:id/revert', auth, adminOnly, controller.orders.revert);
  router.post('/api/orders/:id/lock', auth, controller.orders.lock);
  router.post('/api/orders/:id/unlock', auth, controller.orders.unlock);
  router.get('/api/orders/:id/export', auth, controller.orders.export);

  // Order Items
  router.post('/api/order-items/:id/delete', auth, adminOnly, controller.orderItems.delete);

  // Users (admin only)
  router.get('/api/users', auth, adminOnly, controller.users.index);
  router.post('/api/users', auth, adminOnly, controller.users.create);
  router.post('/api/users/:id/reset-password', auth, adminOnly, controller.users.resetPassword);
};
