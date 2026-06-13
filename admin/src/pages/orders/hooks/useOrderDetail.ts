import { useEffect, useState } from 'react';
import { fetchOrderDetail } from '../../../services/orders';
import type { OrderDetail } from '../../../services/types';

interface OrderDetailState {
  data: OrderDetail | null;
  loading: boolean;
  reload: () => void;
}

export function useOrderDetail(orderId: number): OrderDetailState {
  const [data, setData] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!Number.isInteger(orderId) || orderId <= 0) return;
    let ignore = false;
    setLoading(true);
    fetchOrderDetail(orderId)
      .then(result => {
        if (!ignore) setData(result);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [orderId, version]);

  return {
    data,
    loading,
    reload: () => setVersion(value => value + 1),
  };
}
