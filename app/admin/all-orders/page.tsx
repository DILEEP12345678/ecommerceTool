'use client';

import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Loader2, Package, User, MapPin, Hash, ChevronDown } from 'lucide-react';
import { useHasRole, useUserLoaded } from '../../../components/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, memo } from 'react';
import { usePullToRefresh } from '../../../lib/usePullToRefresh';
import PullToRefreshIndicator from '../../../components/PullToRefreshIndicator';

function useCountUp(value: number, duration = 550) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) { setDisplay(value); return; }
    const startTime = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 2);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);
  return display;
}

const PAGE_SIZE = 40;

export default function AllOrdersPage() {
  const router = useRouter();
  const isAdmin = useHasRole('admin');
  const loaded = useUserLoaded();
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'confirmed' | 'packed' | 'collected'>('all');
  const [selectedCollectionPoint, setSelectedCollectionPoint] = useState<string>('all');
  const [cpOpen, setCpOpen] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (!isAdmin) router.push('/login');
  }, [isAdmin, router, loaded]);

  const { results: orders, status: loadStatus, loadMore } = usePaginatedQuery(
    api.orders.listAllPaginated,
    {
      status: selectedStatus === 'all' ? undefined : selectedStatus,
      collectionPoint: selectedCollectionPoint === 'all' ? undefined : selectedCollectionPoint,
    },
    { initialNumItems: PAGE_SIZE }
  );

  const counts = useQuery(api.orders.getStatusCounts, {
    collectionPoint: selectedCollectionPoint === 'all' ? undefined : selectedCollectionPoint,
  });

  const collectionPoints = useQuery(api.users.getCollectionPoints) ?? [];
  const productRows = useQuery(api.products.list);
  const productImageById = new Map<string, string>((productRows ?? []).map((p: any) => [p.productId, p.image]));
  const productImageByName = new Map<string, string>((productRows ?? []).map((p: any) => [p.name.toLowerCase(), p.image]));
  const getImage = (itemId: string, itemName: string): string | undefined => {
    const baseId = itemId.split(':')[0];
    return productImageById.get(baseId)
      ?? productImageByName.get(itemName.toLowerCase())
      ?? productImageByName.get(itemName.split('(')[0].trim().toLowerCase());
  };

  const { pullDistance, isRefreshing } = usePullToRefresh(() => {});

  if (counts === undefined) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 pb-20 sm:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-pulse h-40" />
          ))}
        </div>
      </div>
    );
  }

  const isSwitchingFilter = loadStatus === 'LoadingFirstPage';
  const stats = counts ?? { confirmed: 0, packed: 0, collected: 0, total: 0 };

  return (
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 pb-24 sm:pb-6">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isRefreshing} />

      {/* Filters row */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Collection point picker */}
        <div className="relative">
          <button
            onClick={() => setCpOpen(o => !o)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-semibold shadow-sm border transition-all ${
              selectedCollectionPoint !== 'all'
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{selectedCollectionPoint === 'all' ? 'All Points' : selectedCollectionPoint}</span>
            <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${cpOpen ? 'rotate-180' : ''}`} />
          </button>
          {cpOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setCpOpen(false)} />
              <div className="absolute left-0 top-full mt-2 z-20 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-3 min-w-[240px] animate-fade-in-scale">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                  Collection points
                </p>
                <div className="flex flex-col">
                  {[{ value: 'all', label: 'All Collection Points' }, ...collectionPoints.map(cp => ({ value: cp, label: cp }))].map((item, idx, arr) => (
                    <button
                      key={item.value}
                      onClick={() => { setSelectedCollectionPoint(item.value); setCpOpen(false); }}
                      className={`flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-left transition-colors rounded-xl whitespace-nowrap ${
                        selectedCollectionPoint === item.value ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      } ${idx < arr.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${selectedCollectionPoint === item.value ? 'text-primary-500' : 'text-gray-400'}`} />
                        {item.label}
                      </div>
                      {selectedCollectionPoint === item.value && (
                        <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Status pills */}
        {(['all', 'confirmed', 'packed', 'collected'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSelectedStatus(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedStatus === s
                ? s === 'all' ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900'
                  : s === 'confirmed' ? 'bg-amber-500 text-white'
                  : s === 'packed' ? 'bg-blue-500 text-white'
                  : 'bg-green-500 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            {s === 'all' ? `All (${stats.total})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${stats[s as 'confirmed'|'packed'|'collected']})`}
          </button>
        ))}
      </div>

      {/* Orders grid */}
      <div
        className="transition-opacity duration-300"
        style={{ opacity: isSwitchingFilter ? 0 : 1 }}
      >
        {orders.length === 0 && !isSwitchingFilter ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <Package className="w-14 h-14 text-gray-200 dark:text-gray-600 mb-3" />
            <p className="text-sm font-semibold text-gray-400">No orders found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order: any, index: number) => (
                <div key={order.orderId} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(index, 12) * 40}ms` }}>
                  <OrderCard order={order} router={router} getImage={getImage} />
                </div>
              ))}
            </div>
            {loadStatus === 'CanLoadMore' && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => loadMore(PAGE_SIZE)}
                  className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-semibold text-gray-600 dark:text-gray-300 hover:border-gray-300 transition-all"
                >
                  <ChevronDown className="w-4 h-4" />
                  Load more
                </button>
              </div>
            )}
            {loadStatus === 'LoadingMore' && (
              <div className="mt-6 flex justify-center">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-white/60 dark:border-white/10 shadow-lg">
        {(() => {
          const tabs = [
            { key: 'all', label: 'All', count: stats.total, activeColor: 'text-gray-900 dark:text-gray-100', inactiveColor: 'text-gray-400', indicatorColor: 'bg-gray-800' },
            { key: 'confirmed', label: 'Confirmed', count: stats.confirmed, activeColor: 'text-amber-600', inactiveColor: 'text-amber-400', indicatorColor: 'bg-amber-500' },
            { key: 'packed', label: 'Packed', count: stats.packed, activeColor: 'text-blue-600', inactiveColor: 'text-blue-400', indicatorColor: 'bg-blue-500' },
            { key: 'collected', label: 'Collected', count: stats.collected, activeColor: 'text-green-600', inactiveColor: 'text-green-400', indicatorColor: 'bg-green-500' },
          ];
          const activeIdx = tabs.findIndex(t => t.key === selectedStatus);
          const activeTab = tabs[activeIdx];
          return (
            <div className="relative">
              <div
                className={`absolute top-0 h-0.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.34,1.2,0.64,1)] ${activeTab?.indicatorColor}`}
                style={{ width: `${100 / tabs.length}%`, transform: `translateX(${activeIdx * 100}%)` }}
              />
              <div className="flex">
                {tabs.map(({ key, label, count, activeColor, inactiveColor }) => (
                  <button
                    key={key}
                    onClick={() => setSelectedStatus(key as any)}
                    className="flex-1 flex flex-col items-center justify-center gap-0.5 py-3"
                  >
                    <span className={`text-lg font-bold leading-none ${selectedStatus === key ? activeColor : inactiveColor}`}>{count}</span>
                    <span className={`text-[10px] font-semibold ${selectedStatus === key ? activeColor : 'text-gray-400'}`}>{label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </nav>
    </div>
  );
}

const OrderCard = memo(({ order, router, getImage }: { order: any; router: any; getImage: (itemId: string, itemName: string) => string | undefined }) => (
  <div
    onClick={() => router.push(`/admin/orders/${order.orderId}`)}
    className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all cursor-pointer"
  >
    <div className="flex items-center justify-between mb-2">
      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Order #{order.orderId.split('-')[1]}</p>
      <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${getStatusColor(order.status)}`}>
        {order.status.toUpperCase()}
      </span>
    </div>
    <div className="flex items-center gap-1.5 mb-0.5">
      <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium truncate">{order.username}</p>
    </div>
    <div className="flex items-center gap-1.5 mb-2">
      <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
      <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{order.collectionPoint}</p>
    </div>
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl px-3 py-2.5 border border-gray-100 dark:border-gray-600">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
          {getImage(order.items[0].itemId, order.items[0].itemName) ? (
            <img src={getImage(order.items[0].itemId, order.items[0].itemName)!} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-400" /></div>
          )}
        </div>
        <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 flex-1 truncate">{order.items[0].itemName}</span>
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">×{order.items[0].quantity}</span>
      </div>
      {order.items.length > 1 && (
        <p className="text-xs text-primary-600 font-semibold mt-1.5 pl-10">+{order.items.length - 1} more</p>
      )}
    </div>
  </div>
));
OrderCard.displayName = 'OrderCard';

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    confirmed: 'bg-amber-100 text-amber-800 dark:bg-amber-500 dark:text-white',
    packed:    'bg-blue-100 text-blue-800 dark:bg-blue-500 dark:text-white',
    collected: 'bg-green-100 text-green-800 dark:bg-green-600 dark:text-white',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100';
}
