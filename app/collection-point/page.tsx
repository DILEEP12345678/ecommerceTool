'use client';

import { usePaginatedQuery, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  Loader2, Package, User, MapPin,
  CheckCircle, ChevronRight, ChevronDown,
} from 'lucide-react';

import toast from 'react-hot-toast';
import { useCollectionPoint, useUser, useUserLoaded } from '../../components/UserContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, memo, Suspense } from 'react';
import { useLastUpdated } from '../../lib/useLastUpdated';

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
  const collectionPoint = useCollectionPoint();
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
    if (!user || user.role !== 'collection_point_manager') {
      router.push('/login');
    }
  }, [user, router, loaded]);

  useEffect(() => {
    setBulkMode(false);
  }, [selectedStatus]);

  const { results: orders, status: loadStatus, loadMore } = usePaginatedQuery(
    api.orders.listAllPaginated,
    collectionPoint ? { collectionPoint, status: selectedStatus } : 'skip',
    { initialNumItems: PAGE_SIZE }
  );

  const counts = useQuery(
    api.orders.getStatusCounts,
    collectionPoint ? { collectionPoint } : 'skip'
  );

  const productRows = useQuery(api.products.list);
  const productImageById = new Map<string, string>(
    (productRows ?? []).map((p: any) => [p.productId, p.image])
  );
  const productImageByName = new Map<string, string>(
    (productRows ?? []).map((p: any) => [p.name.toLowerCase(), p.image])
  );
  const productImageMap = { byId: productImageById, byName: productImageByName };



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

  if (counts === undefined) {
    return (
      <div className="pb-24 sm:pb-6">
        {/* Skeleton header */}
        <div className="bg-primary-600 px-4 pt-4 pb-8">
          <div className="h-7 bg-white/20 rounded-lg w-56 mb-2 animate-pulse" />
          <div className="h-4 bg-white/10 rounded w-36 animate-pulse" />
        </div>
        <div className="px-4 -mt-4">
          <div className="bg-white rounded-2xl shadow-sm p-1 mb-5 animate-pulse h-14" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-24" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isSwitchingFilter = loadStatus === 'LoadingFirstPage';
  const stats = counts ?? { confirmed: 0, packed: 0, collected: 0, total: 0 };

  const tabs = [
    { key: 'confirmed', label: 'Confirmed', count: stats.confirmed },
    { key: 'packed',    label: 'Packed',    count: stats.packed    },
    { key: 'collected', label: 'Collected', count: stats.collected },
  ] as const;

  return (
    <div className="bg-gray-50 pb-24 sm:pb-6">

      {/* ── HERO HEADER ─────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 px-4 pt-4 pb-8">
        <div className="flex items-center gap-1.5 min-w-0">
            <MapPin className="w-4 h-4 text-white/80 flex-shrink-0" />
            <h1 className="text-base font-bold text-white truncate">{collectionPoint}</h1>
            <span className="text-white/40 text-xs flex-shrink-0">·</span>
            <p className="text-xs text-white/60 flex-shrink-0">{today}</p>
            {lastUpdated && (
              <>
                <span className="text-white/40 text-xs flex-shrink-0">·</span>
                <p className="text-xs text-white/60 flex-shrink-0">Updated {lastUpdated}</p>
              </>
            )}
          </div>
      </div>

      <div className="px-4 -mt-5">

        {/* ── STATUS TABS ──────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-md p-1 mb-2 flex gap-1">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setSelectedStatus(key)}
              className={`flex-1 flex flex-row items-center justify-center gap-1.5 py-1.5 px-1 rounded-lg transition-all text-xs font-semibold ${
                selectedStatus === key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <span>{label}</span>
              <span className={`font-bold tabular-nums px-1.5 py-0.5 rounded-full text-xs ${
                selectedStatus === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>


        {/* ── ORDER LIST HEADER ─────────────────────────────── */}
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-semibold text-gray-500">
            {isSwitchingFilter ? 'Loading…' : `${loadStatus === 'CanLoadMore' ? `${orders.length}+` : orders.length} orders`}
          </p>
          {selectedStatus === 'packed' && orders.length > 1 && (
            <button
              onClick={() => setBulkMode(v => !v)}
              className={`text-sm font-semibold transition-colors ${
                bulkMode ? 'text-red-500 hover:text-red-600' : 'text-primary-600 hover:text-primary-700'
              }`}
            >
              {bulkMode ? 'Cancel' : `Select All (${orders.length})`}
            </button>
          )}
        </div>

        {/* ── ORDER CARDS ──────────────────────────────────── */}
        {isSwitchingFilter ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-7 h-7 text-primary-400 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 bg-white rounded-2xl shadow-sm">
            <Package className="w-12 h-12 text-gray-200 mb-2" />
            <p className="text-sm font-semibold text-gray-400">No {selectedStatus} orders</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 sm:grid sm:grid-cols-3 sm:gap-3 sm:space-y-0">
              {orders.map((order: any) => (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  router={router}
                  onMarkCollected={handleMarkOne}
                  productImageMap={productImageMap}
                />
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

      {/* ── BULK MARK AS COLLECTED CTA ───────────────────── */}
      {selectedStatus === 'packed' && bulkMode && (
        <div className="fixed bottom-16 sm:bottom-0 left-0 right-0 z-40 animate-slide-up">
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
const OrderCard = memo(({ order, router, onMarkCollected, productImageMap }: {
  order: any;
  router: any;
  onMarkCollected: (orderId: string) => void;
  productImageMap: { byId: Map<string, string>; byName: Map<string, string> };
}) => {
  const isPacked = order.status === 'packed';
  const previewItems = order.items.slice(0, 2);
  const extraCount = order.items.length - previewItems.length;

  const [timeAgo, setTimeAgo] = useState('');
  useEffect(() => {
    const diff = Date.now() - order.createdAt;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) { setTimeAgo('just now'); return; }
    if (mins < 60) { setTimeAgo(`${mins}m ago`); return; }
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) { setTimeAgo(`${hrs}h ago`); return; }
    setTimeAgo(new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }, [order.createdAt]);

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
      onClick={() => router.push(`/collection-point/orders/${order.orderId}`)}
      className={`bg-white rounded-2xl shadow-sm border transition-all cursor-pointer active:scale-[0.99] overflow-hidden flex flex-col ${
        packingPct !== null && isConfirmed
          ? 'border-orange-200'
          : 'border-transparent hover:shadow-md'
      }`}
    >
      <div className="p-4 flex flex-col flex-1">
        {/* Row 1: order # + status + customer + time */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base font-bold text-gray-900">
                #{order.orderId.split('-')[1]}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${getStatusPill(order.status)}`}>
                {order.status}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-700 truncate">{order.username}</span>
              <span className="text-xs text-gray-400 flex-shrink-0">· {timeAgo}</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
        </div>

        {/* Row 2: item list */}
        <div className="space-y-1.5">
          {previewItems.map((item: any, i: number) => {
            const baseId = item.itemId.split(':')[0];
            const imgSrc = productImageMap.byId.get(baseId)
              ?? productImageMap.byName.get(item.itemName.toLowerCase())
              ?? productImageMap.byName.get(item.itemName.split('(')[0].trim().toLowerCase());
            return (
              <div key={i} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-md bg-gray-100 overflow-hidden flex-shrink-0">
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
            <p className="text-xs text-primary-600 font-semibold pl-10">+{extraCount} more item{extraCount > 1 ? 's' : ''}</p>
          )}
        </div>


        {/* Mark as Collected button — packed orders only */}
        {isPacked && (
          <div className="mt-auto pt-4">
          <button
            onClick={e => { e.stopPropagation(); onMarkCollected(order.orderId); }}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            <CheckCircle className="w-4 h-4" />
            Mark as Collected
          </button>
          </div>
        )}
      </div>

      {/* Packing progress bar — confirmed + partially packed */}
      {isConfirmed && packingPct !== null && (
        <div className="px-4 pb-3 -mt-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-orange-500">Packing in progress</span>
            <span className="text-xs font-bold text-orange-600">{packingPct}%</span>
          </div>
          <div className="w-full bg-orange-100 rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full bg-orange-400 transition-all duration-300"
              style={{ width: `${packingPct}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
});

OrderCard.displayName = 'OrderCard';

function getStatusPill(status: string) {
  const map: Record<string, string> = {
    confirmed: 'bg-amber-100 text-amber-700',
    packed:    'bg-blue-100 text-blue-700',
    collected: 'bg-green-100 text-green-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700';
}
