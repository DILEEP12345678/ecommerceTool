import { useEffect, useRef } from 'react';

interface Order {
  orderId: string;
  username: string;
  createdAt: number;
}

interface UseOrderNotificationsOptions {
  confirmedOrders: Order[] | undefined;
  confirmedCount: number;
  addNotification: (title: string, body: string, id: string) => void;
}

const STALE_HOURS = 6;
const STALE_MS = STALE_HOURS * 60 * 60 * 1000;
const HIGH_VOLUME_THRESHOLD = 5;
const STALE_CHECK_INTERVAL_MS = 5 * 60 * 1000;

function sendBrowserNotification(title: string, body: string, tag: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try { new Notification(title, { body, tag, icon: '/logo.png' }); } catch {}
}

function notify(title: string, body: string, tag: string, addNotification: (t: string, b: string, id: string) => void) {
  sendBrowserNotification(title, body, tag);
  addNotification(title, body, tag);
}

export function useOrderNotifications({ confirmedOrders, confirmedCount, addNotification }: UseOrderNotificationsOptions) {
  const seenIdsRef = useRef<Set<string> | null>(null);
  const notifiedStaleRef = useRef<Set<string>>(new Set());
  const highVolumeNotifiedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  // ── Detect new orders ──────────────────────────────────────────
  useEffect(() => {
    if (!confirmedOrders) return;
    const currentIds = new Set(confirmedOrders.map(o => o.orderId));
    if (seenIdsRef.current === null) { seenIdsRef.current = currentIds; return; }
    for (const order of confirmedOrders) {
      if (!seenIdsRef.current.has(order.orderId)) {
        const shortId = order.orderId.split('-')[1];
        notify(
          '📦 New Order',
          `Order #${shortId} from ${order.username} is ready to pack`,
          `new-order-${order.orderId}`,
          addNotification
        );
      }
    }
    seenIdsRef.current = currentIds;
  }, [confirmedOrders, addNotification]);

  // ── Detect stale orders (>6h unpacked) ────────────────────────
  useEffect(() => {
    const checkStale = () => {
      if (!confirmedOrders) return;
      const now = Date.now();
      for (const order of confirmedOrders) {
        if (notifiedStaleRef.current.has(order.orderId)) continue;
        const ageMs = now - order.createdAt;
        if (ageMs >= STALE_MS) {
          const hours = Math.floor(ageMs / 3600000);
          const mins = Math.floor((ageMs % 3600000) / 60000);
          const shortId = order.orderId.split('-')[1];
          const timeLabel = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
          notify(
            '⏰ Order Waiting Too Long',
            `Order #${shortId} from ${order.username} has been waiting ${timeLabel}`,
            `stale-${order.orderId}`,
            addNotification
          );
          notifiedStaleRef.current.add(order.orderId);
        }
      }
    };
    checkStale();
    const interval = setInterval(checkStale, STALE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [confirmedOrders, addNotification]);

  // ── High volume alert ──────────────────────────────────────────
  useEffect(() => {
    if (confirmedCount >= HIGH_VOLUME_THRESHOLD && !highVolumeNotifiedRef.current) {
      notify(
        '🚨 High Order Volume',
        `${confirmedCount} orders are waiting to be packed — time to hustle!`,
        'high-volume',
        addNotification
      );
      highVolumeNotifiedRef.current = true;
    }
    if (confirmedCount < HIGH_VOLUME_THRESHOLD) highVolumeNotifiedRef.current = false;
  }, [confirmedCount, addNotification]);

  // ── Queue cleared ─────────────────────────────────────────────
  const prevConfirmedRef = useRef<number | null>(null);
  useEffect(() => {
    if (prevConfirmedRef.current === null) { prevConfirmedRef.current = confirmedCount; return; }
    if (prevConfirmedRef.current > 0 && confirmedCount === 0) {
      notify('✅ Queue Cleared!', 'All orders have been packed. Great work!', 'queue-cleared', addNotification);
    }
    prevConfirmedRef.current = confirmedCount;
  }, [confirmedCount, addNotification]);
}
