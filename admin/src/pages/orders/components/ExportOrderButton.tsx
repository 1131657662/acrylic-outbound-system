import { Button, Tooltip, message } from 'antd';
import { exportOrder } from '../../../services/orders';
import type { OrderRow } from '../../../services/types';

interface ExportOrderButtonProps {
  order: OrderRow;
}

export function ExportOrderButton({ order }: ExportOrderButtonProps) {
  const disabled = order.status !== 'completed';

  return (
    <Tooltip title={disabled ? '订单完成后可导出 Excel' : '导出 Excel'}>
      <Button size="small" disabled={disabled} onClick={() => downloadOrder(order)}>
        导出
      </Button>
    </Tooltip>
  );
}

async function downloadOrder(order: OrderRow): Promise<void> {
  try {
    const blob = await exportOrder(order.id);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${order.vehicle_no}_${order.order_no}_出库明细.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '导出失败');
  }
}
