'use client';

import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Loader2, Package, User, MapPin, Hash, ShoppingCart, ChevronDown } from 'lucide-react';
import { useUser, useUserLoaded } from '../../components/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, memo } from 'react';

const PAGE_SIZE = 40;

// Product image mapping
const PRODUCT_IMAGES: Record<string, string> = {
  'PROD-001': 'https://images.unsplash.com/photo-1568702846914-96b305d2aaeb?w=400&h=400&fit=crop',
  'PROD-002': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&h=400&fit=crop',
  'PROD-003': 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=400&fit=crop',
  'PROD-004': 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop',
  'PROD-005': 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop',
  'PROD-006': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&h=400&fit=crop',
  'PROD-007': 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400&h=400&fit=crop',
  'PROD-008': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=400&fit=crop',
  'PROD-009': 'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400&h=400&fit=crop',
  'PROD-010': 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop',
};

export default function AdminPage() {
  const router = useRouter();
  const user = useUser();
  const loaded = useUserLoaded();
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'confirmed' | 'packed' | 'collected'>('all');
  const [selectedCollectionPoint, setSelectedCollectionPoint] = useState<string>('all');

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

  const confirmedItemsList = useQuery(api.orders.getConfirmedItemsSummary, {
    collectionPoint: selectedCollectionPoint === 'all' ? undefined : selectedCollectionPoint,
  });

  const collectionPoints = Array.from(new Set((orders ?? []).map((o: any) => o.collectionPoint)));

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
    <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 pb-20 sm:pb-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="w-7 h-7 text-primary-500" />
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        <p className="text-sm text-gray-500 hidden sm:block">All orders across collection points</p>
      </div>

      {/* Collection Point Filter */}
      <div className="mb-6 bg-white rounded-2xl border-2 border-gray-100 p-5">
        <label className="block text-base font-semibold text-gray-800 mb-2">
          Filter by Collection Point
        </label>
        <select
          value={selectedCollectionPoint}
          onChange={(e) => {
            setSelectedCollectionPoint(e.target.value);
            setSelectedStatus('all');
          }}
          className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 rounded-xl text-gray-900 text-base font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Collection Points</option>
          {collectionPoints.map((cp) => (
            <option key={cp} value={cp}>{cp}</option>
          ))}
        </select>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
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

      {/* Items to Pack */}
      {confirmedItemsList === undefined ? (
        <div className="mb-6 flex justify-center py-5">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      ) : confirmedItemsList.length > 0 && (
        <div className="mb-6 bg-white rounded-2xl border-2 border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="w-6 h-6 text-gray-700" />
            <h2 className="text-lg font-bold text-gray-900">
              Ordered Items ({confirmedItemsList.length} products)
            </h2>
          </div>
          <div className="overflow-x-auto rounded-xl border-2 border-gray-100">
            <table className="w-full min-w-[480px]">
              <thead className="bg-gray-50 border-b-2 border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-800 whitespace-nowrap">Product ID</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-800">Product Name</th>
                  <th className="px-4 py-3 text-left text-sm font-bold text-gray-800">Variants</th>
                  <th className="px-4 py-3 text-right text-sm font-bold text-gray-800 whitespace-nowrap">Total Qty</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {confirmedItemsList.map((product: any) => (
                  <tr key={product.baseId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{product.baseId}</td>
                    <td className="px-4 py-3 text-base font-semibold text-gray-900">{product.productName}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {product.variants.map((v: any) => `${v.variantLabel || 'Single'} ×${v.quantity}`).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-gray-100 text-gray-900">
                        {product.totalQuantity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
                <OrderCard key={order.orderId} order={order} router={router} />
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
    </div>
  );
}

const OrderCard = memo(({ order, router }: { order: any; router: any }) => {
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
              {PRODUCT_IMAGES[order.items[0].itemId] ? (
                <img src={PRODUCT_IMAGES[order.items[0].itemId]} alt={order.items[0].itemName} className="w-full h-full object-cover" />
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
