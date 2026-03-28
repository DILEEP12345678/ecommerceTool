import { useEffect, useRef } from 'react';

interface Order {
  orderId: string;
  status: string;
  collectionPoint: string;
}

export function useCustomerOrderNotifications(
  orders: Order[] | undefined,
  addNotification: (title: string, body: string, id: string) => void
) {
  const prevStatusRef = useRef<Map<string, string>>(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  useEffect(() => {
    if (!orders) return;
    if (!initializedRef.current) {
      for (const order of orders) prevStatusRef.current.set(order.orderId, order.status);
      initializedRef.current = true;
      return;
    }
    for (const order of orders) {
      const prev = prevStatusRef.current.get(order.orderId);
      if (prev !== undefined && prev !== 'packed' && order.status === 'packed') {
        const shortId = order.orderId.split('-')[1];
        const title = '🎉 Your order is ready!';
        const body = `Order #${shortId} is packed and ready to collect at ${order.collectionPoint}`;
        const tag = `packed-${order.orderId}`;
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try { new Notification(title, { body, tag, icon: '/logo.png' }); } catch {}
        }
        addNotification(title, body, tag);
      }
      prevStatusRef.current.set(order.orderId, order.status);
    }
  }, [orders, addNotification]);
}
