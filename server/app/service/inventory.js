'use strict';

const { Service } = require('egg');
const { parseSkuContent } = require('../utils/sku_parser');

class InventoryService extends Service {
  async importSku(payload, user) {
    const parsed = parseSkuContent(payload.content);
    const shippedCodes = await this.activeShippedCodes();
    const rows = parsed.items.filter(item => !shippedCodes.has(item.roll_code));
    const skipped = parsed.items.filter(item => shippedCodes.has(item.roll_code));

    const result = await this.app.mysql.beginTransactionScope(async conn => {
      await conn.delete('inventory', {});
      const batch = await this.createBatch(conn, payload, user, parsed, skipped);
      await this.insertInventoryRows(conn, rows, batch.insertId);
      return { batchId: batch.insertId };
    }, this.ctx);

    return {
      ...result,
      totalCount: parsed.total,
      successCount: rows.length,
      skippedCount: skipped.length,
      errorCount: parsed.errors.length,
      errors: parsed.errors,
      skippedRollCodes: skipped.map(item => item.roll_code),
    };
  }

  async syncAvailable() {
    return await this.app.mysql.select('inventory', {
      where: { status: 'available' },
      orders: [[ 'product_code', 'asc' ], [ 'roll_code', 'asc' ]],
    });
  }

  async list(query) {
    const where = {};
    if (query.status) where.status = query.status;
    if (query.product_code) where.product_code = query.product_code;

    let sql = 'SELECT * FROM inventory';
    const params = [];
    const conditions = [];

    if (where.status) {
      conditions.push('status = ?');
      params.push(where.status);
    }
    if (where.product_code) {
      conditions.push('product_code LIKE ?');
      params.push(`%${where.product_code}%`);
    }
    if (query.roll_code) {
      conditions.push('roll_code LIKE ?');
      params.push(`%${query.roll_code}%`);
    }
    if (query.model) {
      conditions.push('model LIKE ?');
      params.push(`%${query.model}%`);
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY product_code ASC, roll_code ASC';

    if (query.limit) {
      const limit = parseInt(query.limit);
      if (limit > 0) {
        sql += ' LIMIT ?';
        params.push(limit);
      }
    }

    return await this.app.mysql.query(sql, params);
  }

  async activeShippedCodes() {
    const rows = await this.app.mysql.query(
      'SELECT DISTINCT roll_code FROM order_items WHERE status = ?',
      [ 'active' ]
    );
    return new Set(rows.map(row => row.roll_code));
  }

  async createBatch(conn, payload, user, parsed, skipped) {
    return await conn.insert('sku_import_batches', {
      file_name: payload.fileName || 'sku.txt',
      total_count: parsed.total,
      success_count: parsed.items.length - skipped.length,
      skipped_count: skipped.length,
      error_count: parsed.errors.length,
      warning_message: skipped.map(item => item.roll_code).join(','),
      operator: user.username,
    });
  }

  async insertInventoryRows(conn, rows, batchId) {
    if (!rows.length) return;
    await conn.insert('inventory', rows.map(row => ({
      ...row,
      status: 'available',
      import_batch_id: batchId,
    })));
  }
}

module.exports = InventoryService;
