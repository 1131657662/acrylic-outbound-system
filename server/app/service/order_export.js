'use strict';

const ExcelJS = require('exceljs');
const { Service } = require('egg');

class OrderExportService extends Service {
  async export(orderId) {
    const order = await this.app.mysql.get('orders', { id: Number(orderId) });
    if (!order) this.ctx.throw(404, '订单不存在');
    const items = await this.ctx.service.orderQuery.items(Number(orderId));
    return {
      fileName: this.fileName(order),
      buffer: await this.workbookBuffer(items),
    };
  }

  fileName(order) {
    return `${order.vehicle_no}_${order.order_no}_出库明细.xlsx`;
  }

  async workbookBuffer(items) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('出库明细');
    sheet.addRow([ '序号', '型号', '条码号', '重量', '扫码人', '日期时间' ]);
    items.forEach(item => sheet.addRow([
      item.scan_seq,
      cleanModel(item.model),
      item.roll_code,
      Number(item.weight),
      item.operator,
      this.formatDate(item.scanned_at),
    ]));
    return await workbook.xlsx.writeBuffer();
  }

  formatDate(value) {
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  }
}

function cleanModel(raw) {
  if (!raw) return raw;
  const parts = raw.split(' ');
  const cleaned = [];
  for (const p of parts) {
    if (/[\u4e00-\u9fff]/.test(p)) break;
    cleaned.push(p);
  }
  return cleaned.join(' ');
}

module.exports = OrderExportService;
