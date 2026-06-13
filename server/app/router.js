'use strict';

module.exports = app => {
  const { router, controller, middleware } = app;
  const auth = middleware.auth();

  router.post('/api/auth/login', controller.auth.login);

  router.post('/api/inventory/import', auth, controller.inventory.importSku);
  router.get('/api/inventory/sync', auth, controller.inventory.sync);

  router.get('/api/orders', auth, controller.orders.index);
  router.get('/api/orders/pending', auth, controller.orders.pending);
  router.get('/api/orders/:id', auth, controller.orders.show);
  router.post('/api/orders/create', auth, controller.orders.create);
  router.post('/api/orders/local-sync', auth, controller.orders.localSync);
  router.post('/api/orders/submit', auth, controller.orders.submit);
  router.post('/api/orders/:id/cancel', auth, controller.orders.cancel);
  router.post('/api/orders/:id/revert', auth, controller.orders.revert);
  router.post('/api/orders/:id/lock', auth, controller.orders.lock);
  router.post('/api/orders/:id/unlock', auth, controller.orders.unlock);
  router.get('/api/orders/:id/export', auth, controller.orders.export);

  router.post('/api/order-items/:id/delete', auth, controller.orderItems.delete);
};
