'use client';

import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Loader2, Package, User, MapPin, Hash, ChevronDown } from 'lucide-react';
import { useUser, useUserLoaded } from '../../components/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, memo } from 'react';
import { usePullToRefresh } from '../../lib/usePullToRefresh';
import PullToRefreshIndicator from '../../components/PullToRefreshIndicator';

const PAGE_SIZE = 40;


export default function AdminPage() {
  const router = useRouter();
  const user = useUser();
  const loaded = useUserLoaded();
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'confirmed' | 'packed' | 'collected'>('all');
  const [selectedCollectionPoint, setSelectedCollectionPoint] = useState<string>('all');
  const [cpOpen, setCpOpen] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    if (!user || user.role !== 'admin') {
      router.push('/login');
    }
  }, [user, router, loaded]);

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
        <div className="h-8 bg-gray-200 rounded w-52 mb-5 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 p-5 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="h-5 bg-gray-200 rounded w-20" />
                <div className="h-6 bg-gray-200 rounded w-24" />
              </div>
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-20 bg-gray-100 rounded mb-3" />
            </div>
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
      {/* Collection Point Filter */}
      <div className="mb-6 relative">
        <button
          onClick={() => setCpOpen(o => !o)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold shadow-sm border-2 transition-all ${
            selectedCollectionPoint !== 'all'
              ? 'bg-primary-50 border-primary-300 text-primary-700 hover:border-primary-400'
              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span>{selectedCollectionPoint === 'all' ? 'All Collection Points' : selectedCollectionPoint}</span>
          <ChevronDown className={`w-4 h-4 opacity-60 transition-transform duration-200 ${cpOpen ? 'rotate-180' : ''}`} />
        </button>

        {cpOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setCpOpen(false)} />
            <div className="absolute left-0 top-full mt-2 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 min-w-[240px] animate-fade-in-scale">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                Collection points
              </p>
              <div className="flex flex-col">
                {[{ value: 'all', label: 'All Collection Points' }, ...collectionPoints.map(cp => ({ value: cp, label: cp }))].map((item, idx, arr) => (
                  <button
                    key={item.value}
                    onClick={() => { setSelectedCollectionPoint(item.value); setSelectedStatus('all'); setCpOpen(false); }}
                    className={`flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-left transition-colors rounded-xl whitespace-nowrap ${
                      selectedCollectionPoint === item.value ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                    } ${idx < arr.length - 1 ? 'border-b border-gray-100' : ''}`}
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

      {/* Stats Grid — desktop only */}
      <div className="mb-6 hidden sm:grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
        {[
          { key: 'all',       label: 'Total',     count: stats.total,     icon: Hash,    active: 'bg-gray-800 border-gray-900', inactive: 'bg-white border-gray-200', activeText: 'text-white', inactiveText: 'text-gray-900', activeLabel: 'text-gray-300', inactiveLabel: 'text-gray-500', activeIcon: 'text-white', inactiveIcon: 'text-gray-500' },
          { key: 'confirmed', label: 'Confirmed', count: stats.confirmed, icon: Package, active: 'bg-yellow-600 border-yellow-700', inactive: 'bg-yellow-50 border-yellow-200', activeText: 'text-white', inactiveText: 'text-yellow-900', activeLabel: 'text-yellow-100', inactiveLabel: 'text-yellow-700', activeIcon: 'text-yellow-100', inactiveIcon: 'text-yellow-700' },
          { key: 'packed',    label: 'Packed',    count: stats.packed,    icon: Package, active: 'bg-blue-600 border-blue-700', inactive: 'bg-blue-50 border-blue-200', activeText: 'text-white', inactiveText: 'text-blue-900', activeLabel: 'text-blue-100', inactiveLabel: 'text-blue-700', activeIcon: 'text-blue-100', inactiveIcon: 'text-blue-700' },
          { key: 'collected', label: 'Collected', count: stats.collected, icon: Package, active: 'bg-green-600 border-green-700', inactive: 'bg-green-50 border-green-200', activeText: 'text-white', inactiveText: 'text-green-900', activeLabel: 'text-green-100', inactiveLabel: 'text-green-700', activeIcon: 'text-green-100', inactiveIcon: 'text-green-700' },
        ].map(({ key, label, count, icon: Icon, active, inactive, activeText, inactiveText, activeLabel, inactiveLabel, activeIcon, inactiveIcon }) => (
          <button
            key={key}
            onClick={() => setSelectedStatus(key as any)}
            className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 sm:py-4 rounded-2xl border-2 transition-all ${selectedStatus === key ? active : inactive} hover:shadow-md`}
          >
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${selectedStatus === key ? activeIcon : inactiveIcon}`} />
            <div className="text-left min-w-0">
              <p className={`text-xs sm:text-sm font-medium ${selectedStatus === key ? activeLabel : inactiveLabel}`}>{label}</p>
              <p className={`text-xl sm:text-2xl font-bold ${selectedStatus === key ? activeText : inactiveText}`}>{count}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Orders Section */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
        <div className="flex items-center gap-2 mb-5">
          <Package className="w-6 h-6 text-gray-700" />
          <h2 className="text-lg font-bold text-gray-900">
            Orders {loadStatus === 'CanLoadMore' ? `(${orders.length}+ loaded)` : `(${orders.length})`}
          </h2>
        </div>

        {isSwitchingFilter ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl">
            <Package className="w-16 h-16 text-gray-200 mb-3" />
            <p className="text-base text-gray-500 font-medium">No orders found</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order: any) => (
                <OrderCard key={order.orderId} order={order} router={router} getImage={getImage} />
              ))}
            </div>

            {loadStatus === 'CanLoadMore' && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => loadMore(PAGE_SIZE)}
                  className="flex items-center gap-2 px-8 py-4 bg-white border-2 border-gray-300 rounded-xl text-base font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all"
                >
                  <ChevronDown className="w-5 h-5" />
                  Load more orders
                </button>
              </div>
            )}
            {loadStatus === 'LoadingMore' && (
              <div className="mt-6 flex justify-center">
                <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile status bottom tab bar */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-lg">
        <div className="flex">
          {[
            { key: 'all',       label: 'All',       count: stats.total,     color: 'text-gray-600',   activeColor: 'text-gray-900',   activeBg: 'bg-gray-100'  },
            { key: 'confirmed', label: 'Confirmed',  count: stats.confirmed, color: 'text-yellow-500', activeColor: 'text-yellow-700', activeBg: 'bg-yellow-50' },
            { key: 'packed',    label: 'Packed',     count: stats.packed,    color: 'text-blue-500',   activeColor: 'text-blue-700',   activeBg: 'bg-blue-50'   },
            { key: 'collected', label: 'Collected',  count: stats.collected, color: 'text-green-500',  activeColor: 'text-green-700',  activeBg: 'bg-green-50'  },
          ].map(({ key, label, count, color, activeColor, activeBg }) => {
            const isActive = selectedStatus === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedStatus(key as any)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-3 transition-colors ${isActive ? activeBg : ''}`}
              >
                <span className={`text-lg font-bold leading-none ${isActive ? activeColor : color}`}>{count}</span>
                <span className={`text-[10px] font-semibold ${isActive ? activeColor : 'text-gray-400'}`}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

const OrderCard = memo(({ order, router, getImage }: { order: any; router: any; getImage: (itemId: string, itemName: string) => string | undefined }) => {
  return (
    <div
      onClick={() => router.push(`/admin/orders/${order.orderId}`)}
      className="bg-gray-50 rounded-2xl border-2 border-gray-100 p-5 hover:shadow-md hover:border-primary-300 transition-all flex flex-col cursor-pointer"
    >
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-base font-bold text-gray-900">
            Order #{order.orderId.split('-')[1]}
          </p>
          <span className={`px-3 py-1 text-sm font-bold rounded-lg ${getStatusColor(order.status)}`}>
            {order.status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-gray-400" />
          <p className="text-sm text-gray-600 font-medium truncate">{order.username}</p>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-gray-400" />
          <p className="text-sm text-gray-700 font-semibold truncate">{order.collectionPoint}</p>
        </div>
        <p className="text-sm text-gray-400">
          {new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>

      <div className="mb-3 bg-white rounded-xl px-4 py-3 border border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
              {getImage(order.items[0].itemId, order.items[0].itemName) ? (
                <img src={getImage(order.items[0].itemId, order.items[0].itemName)} alt={order.items[0].itemName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
            <span className="text-base font-semibold text-gray-900 truncate">{order.items[0].itemName}</span>
          </div>
          <span className="text-base font-bold text-gray-900 ml-3 flex-shrink-0">×{order.items[0].quantity}</span>
        </div>
        {order.items.length > 1 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-sm text-primary-600 font-semibold">
              +{order.items.length - 1} more item{order.items.length - 1 !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-gray-100">
        <p className="text-sm text-gray-500 text-center font-medium">Tap to view details</p>
      </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    confirmed: 'bg-yellow-100 text-yellow-800',
    packed: 'bg-blue-100 text-blue-800',
    collected: 'bg-green-100 text-green-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
