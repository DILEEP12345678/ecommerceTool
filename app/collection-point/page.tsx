'use client';

import { usePaginatedQuery, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Loader2, Package, User, MapPin,
  CheckCircle, ChevronDown,
} from 'lucide-react';

import toast from 'react-hot-toast';
import { useCollectionPoint, useHasRole, useUser, useUserLoaded } from '../../components/UserContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, memo, Suspense } from 'react';
import { useLastUpdated } from '../../lib/useLastUpdated';
import { usePullToRefresh } from '../../lib/usePullToRefresh';
import PullToRefreshIndicator from '../../components/PullToRefreshIndicator';
import { buildBagPlan, type ProductMeta } from '../../lib/bagPlan';
import { useOrderNotifications } from '../../lib/useOrderNotifications';
import { useNotifications } from '../../components/NotificationContext';

const PAGE_SIZE = 40;


export default function CollectionPointPage() {
  return (
    <Suspense>
      <CollectionPointContent />
    </Suspense>
  );
}

function CollectionPointContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useUser();
  const loaded = useUserLoaded();
  const isAdmin = useHasRole('admin');
  const userCollectionPoint = useCollectionPoint();
  const cpParam = searchParams.get('cp');
  const collectionPoint = isAdmin ? (cpParam ?? userCollectionPoint) : userCollectionPoint;
  const allCollectionPoints = useQuery(api.users.getCollectionPoints) ?? [];
  const [selectedStatus, setSelectedStatus] = useState<'confirmed' | 'packed' | 'collected'>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'packed' || tab === 'collected') return tab;
    return 'confirmed';
  });
  const [bulkMode, setBulkMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [today, setToday] = useState('');
  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  }, []);
  const updateStatus = useMutation(api.orders.updateStatus);

  useEffect(() => {
    if (!loaded) return;
    if (!user) { router.push('/login'); return; }
  }, [user, router, loaded]);

  useEffect(() => {
    setBulkMode(false);
  }, [selectedStatus]);

  // Keep tab in URL so browser back returns to the correct tab
  useEffect(() => {
    const params = new URLSearchParams();
    if (cpParam) params.set('cp', cpParam);
    if (selectedStatus !== 'confirmed') params.set('tab', selectedStatus);
    const qs = params.toString();
    router.replace(`/collection-point${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [selectedStatus, cpParam]); // eslint-disable-line react-hooks/exhaustive-deps

  const { results: orders, status: loadStatus, loadMore } = usePaginatedQuery(
    api.orders.listAllPaginated,
    collectionPoint ? { collectionPoint, status: selectedStatus } : 'skip',
    { initialNumItems: PAGE_SIZE }
  );

  const counts = useQuery(
    api.orders.getStatusCounts,
    collectionPoint ? { collectionPoint } : 'skip'
  );

  // Always watch confirmed orders for notifications (independent of selected tab)
  const confirmedOrdersForNotif = useQuery(
    api.orders.getByCollectionPointAndStatus,
    collectionPoint ? { collectionPoint, status: 'confirmed', limit: 50 } : 'skip'
  );
  const { addNotification } = useNotifications();
  useOrderNotifications({
    confirmedOrders: confirmedOrdersForNotif ?? undefined,
    confirmedCount: counts?.confirmed ?? 0,
    addNotification,
  });

  // ── Pack-exit animation ──────────────────────────────────
  const prevConfirmedRef = useRef<Map<string, any>>(new Map());
  const [exitingOrders, setExitingOrders] = useState<Map<string, any>>(new Map());

  useEffect(() => {
    if (!confirmedOrdersForNotif) return;
    const currentIds = new Set(confirmedOrdersForNotif.map((o: any) => o.orderId));
    const prev = prevConfirmedRef.current;
    const disappeared: any[] = [];
    prev.forEach((order, id) => { if (!currentIds.has(id)) disappeared.push(order); });
    if (disappeared.length > 0 && selectedStatus === 'confirmed') {
      setExitingOrders(prev => { const n = new Map(prev); disappeared.forEach(o => n.set(o.orderId, o)); return n; });
      setTimeout(() => {
        setExitingOrders(prev => { const n = new Map(prev); disappeared.forEach(o => n.delete(o.orderId)); return n; });
      }, 650);
    }
    const next = new Map<string, any>();
    confirmedOrdersForNotif.forEach((o: any) => next.set(o.orderId, o));
    prevConfirmedRef.current = next;
  }, [confirmedOrdersForNotif, selectedStatus]);

  const productRows = useQuery(api.products.list);
  const productImageById = new Map<string, string>(
    (productRows ?? []).map((p: any) => [p.productId, p.image])
  );
  const productImageByName = new Map<string, string>(
    (productRows ?? []).map((p: any) => [p.name.toLowerCase(), p.image])
  );
  const productImageMap = { byId: productImageById, byName: productImageByName };

  const productMap = new Map<string, ProductMeta>();
  for (const p of (productRows ?? []) as any[]) {
    for (const v of (p.variants ?? [])) {
      productMap.set(`${p.productId}:${v.label}`, { weightG: v.weightG, sensitivity: p.sensitivity });
    }
    if (p.variants?.length) {
      productMap.set(p.productId, { weightG: p.variants[0].weightG, sensitivity: p.sensitivity });
    }
  }



  const handleMarkOne = async (orderId: string) => {
    try {
      await updateStatus({ orderId, status: 'collected' });
      toast.success('Order marked as collected!');
    } catch {
      toast.error('Failed to update order. Please try again.');
    }
  };

  const handleMarkAll = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      await Promise.all(orders.map((o: any) => updateStatus({ orderId: o.orderId, status: 'collected' })));
      setBulkMode(false);
      toast.success(`Marked ${orders.length} order${orders.length > 1 ? 's' : ''} as collected!`);
    } catch {
      toast.error('Failed to update orders. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const lastUpdated = useLastUpdated(orders);
  const { pullDistance, isRefreshing } = usePullToRefresh(() => {
    // Convex is real-time; brief visual feedback is sufficient
  });

  // Admin with no CP selected — show picker
  if (isAdmin && !collectionPoint) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary-400 via-primary-500 to-emerald-400" />
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-primary-50 rounded-2xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary-500" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">Select Collection Point</h1>
                  <p className="text-xs text-gray-500">Choose a point to manage</p>
                </div>
              </div>
              <div className="space-y-2">
                {allCollectionPoints.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-6">No collection points found.</p>
                ) : (
                  allCollectionPoints.map((cp) => (
                    <button
                      key={cp}
                      onClick={() => router.replace(`/collection-point?cp=${encodeURIComponent(cp)}`)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50 hover:border-primary-400 hover:bg-primary-50 transition-all text-left"
                    >
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="font-semibold text-sm text-gray-700">{cp}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (counts === undefined) {
    return (
      <div className="pb-36 px-4 pt-4">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  const isSwitchingFilter = loadStatus === 'LoadingFirstPage';
  const stats = counts ?? { confirmed: 0, packed: 0, collected: 0, total: 0 };

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const visibleOrders = selectedStatus === 'collected'
    ? orders.filter((o: any) => Date.now() - (o.statusUpdatedAt ?? o.createdAt) < WEEK_MS)
    : orders;

  const tabs = [
    { key: 'confirmed', label: 'Confirmed', count: stats.confirmed },
    { key: 'packed',    label: 'Packed',    count: stats.packed    },
    { key: 'collected', label: 'Collected', count: stats.collected },
  ] as const;

  const tabStyle = {
    confirmed: { active: 'bg-amber-500 text-white',  badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500'  },
    packed:    { active: 'bg-blue-500 text-white',   badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500'   },
    collected: { active: 'bg-green-500 text-white',  badge: 'bg-green-100 text-green-700', dot: 'bg-green-500'  },
  } as const;

  return (
    <div className="bg-gray-50 pb-6 max-sm:pb-32">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      <div className="px-4 pt-4">

        {/* ── STATUS TABS — desktop inline ──────────────────── */}
        <div className="hidden sm:flex bg-white border border-gray-100 rounded-xl shadow-sm p-1 mb-2 gap-1">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setSelectedStatus(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg transition-all text-sm font-semibold ${
                selectedStatus === key ? tabStyle[key].active : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {label}
              {selectedStatus === key && visibleOrders.length > 0 && (
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-white/25 text-white">{visibleOrders.length}{loadStatus === 'CanLoadMore' ? '+' : ''}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── ORDER LIST HEADER ─────────────────────────────── */}
        {selectedStatus === 'packed' && orders.length > 0 && !isSwitchingFilter && (
          <div className="mb-1.5">
            <button
              onClick={() => setBulkMode(v => !v)}
              className={`text-sm font-semibold transition-colors ${
                bulkMode ? 'text-red-500 hover:text-red-600' : 'text-primary-600 hover:text-primary-700'
              }`}
            >
              {bulkMode ? 'Cancel' : `Select All (${orders.length})`}
            </button>
          </div>
        )}

        {/* ── ORDER CARDS ──────────────────────────────────── */}
        {isSwitchingFilter ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : visibleOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl shadow-sm">
              <Package className="w-12 h-12 text-gray-200 mb-2" />
              <p className="text-sm font-semibold text-gray-400">No {selectedStatus} orders</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:gap-3 sm:space-y-0">
                {visibleOrders.map((order: any, index: number) => (
                  <div
                    key={order.orderId}
                    className="animate-card-enter"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <OrderCard
                      order={order}
                      router={router}
                      cpParam={cpParam}
                      onMarkCollected={handleMarkOne}
                      productImageMap={productImageMap}
                      productMap={productMap}
                    />
                  </div>
                ))}
                {selectedStatus === 'confirmed' && Array.from(exitingOrders.values()).map(order => (
                  <div key={`exit-${order.orderId}`} className="animate-pack-exit pointer-events-none">
                    <OrderCard
                      order={order}
                      router={router}
                      cpParam={cpParam}
                      onMarkCollected={() => {}}
                      productImageMap={productImageMap}
                      productMap={productMap}
                    />
                  </div>
                ))}
              </div>

              {loadStatus === 'CanLoadMore' && (
                <div className="mt-5 flex justify-center">
                  <button
                    onClick={() => loadMore(PAGE_SIZE)}
                    className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:border-gray-300 transition-all shadow-sm"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Load more
                  </button>
                </div>
              )}
              {loadStatus === 'LoadingMore' && (
                <div className="mt-5 flex justify-center">
                  <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                </div>
              )}
            </>
          )}
      </div>


      {/* ── STATUS TABS — mobile fixed bottom ────────────── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-white/60 dark:border-white/10 shadow-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        {(() => {
          const activeIdx = tabs.findIndex(t => t.key === selectedStatus);
          const indicatorColors = { confirmed: 'bg-amber-500', packed: 'bg-blue-500', collected: 'bg-green-500' } as const;
          const activeColors   = { confirmed: 'text-amber-600', packed: 'text-blue-600', collected: 'text-green-600' } as const;
          return (
            <div className="relative">
              <div
                className={`absolute top-0 h-0.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] ${indicatorColors[selectedStatus]}`}
                style={{ width: `${100 / tabs.length}%`, transform: `translateX(${activeIdx * 100}%)` }}
              />
              <div className="flex">
                {tabs.map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedStatus(key)}
                    className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3"
                  >
                    <span className={`text-lg font-bold leading-none ${selectedStatus === key ? activeColors[key] : 'text-gray-400'}`}>{count}</span>
                    <span className={`text-[10px] font-semibold ${selectedStatus === key ? activeColors[key] : 'text-gray-400'}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </nav>

      {/* ── BULK MARK AS COLLECTED CTA ───────────────────── */}
      {selectedStatus === 'packed' && bulkMode && (
        <div className="fixed bottom-[62px] sm:bottom-0 left-0 right-0 z-40 animate-slide-up">
          <div className="bg-white border-t border-gray-100 shadow-2xl px-4 py-3">
            <div className="max-w-4xl mx-auto">
              <button
                onClick={handleMarkAll}
                disabled={isProcessing}
                className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg text-white transition-all ${
                  isProcessing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 active:bg-green-700 shadow-lg'
                }`}
              >
                <CheckCircle className="w-6 h-6" />
                {isProcessing ? 'Processing…' : `Mark All ${orders.length} Orders as Collected`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ORDER CARD ───────────────────────────────────────────
const OrderCard = memo(({ order, router, cpParam, onMarkCollected, productImageMap, productMap }: {
  order: any;
  router: any;
  cpParam: string | null;
  onMarkCollected: (orderId: string) => void;
  productImageMap: { byId: Map<string, string>; byName: Map<string, string> };
  productMap: Map<string, ProductMeta>;
}) => {
  const isPacked = order.status === 'packed';
  const bagCount = isPacked ? buildBagPlan(order.items, productMap).length : 0;
  const previewItems = order.items.slice(0, 2);
  const extraCount = order.items.length - previewItems.length;

  const [timeAgo, setTimeAgo] = useState('');
  const [ageHrs, setAgeHrs] = useState(0);
  const [idleLabel, setIdleLabel] = useState('');
  useEffect(() => {
    const diff = Date.now() - order.createdAt;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    setAgeHrs(hrs);
    if (mins < 1) { setTimeAgo('just now'); setIdleLabel('Just arrived'); return; }
    if (mins < 60) { setTimeAgo(`${mins}m ago`); setIdleLabel(`Waiting ${mins}m`); return; }
    if (hrs < 24) {
      setTimeAgo(`${hrs}h ago`);
      setIdleLabel(`Waiting ${remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`}`);
      return;
    }
    const label = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    setTimeAgo(label);
    setIdleLabel(`Since ${label}`);
  }, [order.createdAt]);

  const urgency = order.status === 'confirmed'
    ? ageHrs >= 4 ? 'red' : ageHrs >= 2 ? 'amber' : 'gray'
    : null;

  const [packingPct, setPackingPct] = useState<number | null>(null);
  useEffect(() => {
    if (order.status !== 'confirmed') return;
    try {
      const saved = localStorage.getItem(`packed-items-${order.orderId}`);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || !Array.isArray(parsed[0])) return;
      const map = new Map<number, number>(parsed);
      let totalQty = 0;
      let packedQtySum = 0;
      order.items.forEach((item: any, i: number) => {
        totalQty += item.quantity;
        packedQtySum += Math.min(item.quantity, map.get(i) ?? 0);
      });
      if (totalQty > 0 && packedQtySum > 0) {
        setPackingPct(Math.round((packedQtySum / totalQty) * 100));
      }
    } catch {}
  }, [order.orderId, order.status]);

  const isConfirmed = order.status === 'confirmed';

  return (
    <div
      onClick={() => router.push(`/collection-point/orders/${order.orderId}${cpParam ? `?cp=${encodeURIComponent(cpParam)}` : ''}`)}
      className={`bg-white rounded-2xl shadow-md border border-transparent hover:shadow-lg transition-all cursor-pointer active:scale-[0.99] overflow-hidden flex flex-col ${isPacked ? 'sm:h-64' : 'sm:h-52'}`}
    >
      <div className="p-4 flex flex-col flex-1 min-h-0">
        {/* Row 1: order # + badges + customer + time */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-base font-bold text-gray-900 truncate">{order.username}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-400">
                #{order.orderId.split('-')[1]}
              </span>
              {isPacked && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500 text-white flex-shrink-0">Packed</span>
              )}
              {isPacked && bagCount > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex-shrink-0">{bagCount} bag{bagCount > 1 ? 's' : ''}</span>
              )}
              {urgency && idleLabel && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                  urgency === 'red'   ? 'bg-red-500 text-white' :
                  urgency === 'amber' ? 'bg-amber-400 text-white' :
                                       'bg-gray-200 text-gray-600'
                }`}>{idleLabel}</span>
              )}
            </div>
            {timeAgo && <span className="text-xs text-gray-400 mt-0.5 block">{timeAgo}</span>}
          </div>
          {isConfirmed && packingPct !== null ? (() => {
            const r = 14;
            const circ = 2 * Math.PI * r;
            const offset = circ * (1 - packingPct / 100);
            return (
              <div className="relative w-9 h-9 flex-shrink-0">
                <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                  <circle cx="18" cy="18" r={r} fill="none" stroke="#fed7aa" strokeWidth="3" />
                  <circle cx="18" cy="18" r={r} fill="none" stroke="#f97316" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-orange-600">
                  {packingPct}%
                </span>
              </div>
            );
          })() : null}
        </div>

        {/* Row 2: always 2 fixed slots so all cards are identical height */}
        <div className="flex flex-col flex-1">
          {[0, 1].map((i) => {
            const item = previewItems[i];
            if (!item) return <div key={i} className="h-10 flex-shrink-0" />;
            const baseId = item.itemId.split(':')[0];
            const imgSrc = productImageMap.byId.get(baseId)
              ?? productImageMap.byName.get(item.itemName.toLowerCase())
              ?? productImageMap.byName.get(item.itemName.split('(')[0].trim().toLowerCase());
            return (
              <div key={i} className="h-10 flex items-center gap-2 flex-shrink-0" style={{ borderTop: i === 1 ? '1px solid rgba(0,0,0,0.06)' : undefined }}>
                <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {imgSrc ? (
                    <img src={imgSrc} alt={item.itemName} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-4 h-4 text-gray-300" />
                    </div>
                  )}
                </div>
                <span className="text-sm text-gray-700 flex-1 truncate">{item.itemName}</span>
                <span className="text-xs font-semibold text-gray-400 flex-shrink-0">×{item.quantity}</span>
              </div>
            );
          })}
          {extraCount > 0 && (
            <p className="text-xs text-primary-600 font-semibold pl-11 pt-1">+{extraCount} more item{extraCount > 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Button area — mobile only for packed, hidden on desktop to match confirmed card layout */}
        <div className="mt-auto pt-3">
          {isPacked && (
            <button
              onClick={e => { e.stopPropagation(); onMarkCollected(order.orderId); }}
              className="w-full flex items-center justify-center gap-2 py-2 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              Mark as Collected
            </button>
          )}
        </div>
      </div>

    </div>
  );
});

OrderCard.displayName = 'OrderCard';

