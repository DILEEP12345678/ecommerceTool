'use client';

import { usePaginatedQuery, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ClipboardList, Loader2, Package, ChevronDown, MapPin } from 'lucide-react';
import { useUsername, useUserLoaded } from '../../../components/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, memo } from 'react';

const PAGE_SIZE = 20;

export default function OrdersPage() {
  const router = useRouter();
  const username = useUsername();
  const loaded = useUserLoaded();
  const { results: orders, status: loadStatus, loadMore } = usePaginatedQuery(
    api.orders.getByUsernamePaginated,
    username ? { username } : 'skip',
    { initialNumItems: PAGE_SIZE }
  );

  const productRows = useQuery(api.products.list);
  const productImageById = new Map<string, string>((productRows ?? []).map((p: any) => [p.productId, p.image]));
  const productImageByName = new Map<string, string>((productRows ?? []).map((p: any) => [p.name.toLowerCase(), p.image]));
  const getImage = (itemId: string, itemName: string): string | undefined => {
    const baseId = itemId.split(':')[0];
    return productImageById.get(baseId)
      ?? productImageByName.get(itemName.toLowerCase())
      ?? productImageByName.get(itemName.split('(')[0].trim().toLowerCase());
  };

  useEffect(() => {
    if (!loaded) return;
    if (!username) {
      router.push('/login');
    }
  }, [username, router, loaded]);

  if (loadStatus === 'LoadingFirstPage') {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border-2 border-gray-100 p-5 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="h-5 bg-gray-200 rounded w-20" />
                <div className="h-6 bg-gray-200 rounded w-24" />
              </div>
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-4" />
              <div className="h-20 bg-gray-100 rounded mb-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <ClipboardList className="w-24 h-24 text-gray-200 mb-5" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Orders</h2>
        <p className="text-gray-500 text-lg">No orders yet</p>
        <p className="text-gray-400 mt-1">
          Your order history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 sm:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <ClipboardList className="w-7 h-7 text-primary-500" />
        <h1 className="text-2xl font-bold text-gray-900">
          My Orders
          <span className="ml-2 text-base font-normal text-gray-500">
            ({loadStatus === 'CanLoadMore' ? `${orders.length}+` : orders.length})
          </span>
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orders.map((order: any) => (
          <OrderCard key={order.orderId} order={order} router={router} getImage={getImage} />
        ))}
      </div>

      {/* Load More */}
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
    </div>
  );
}

const OrderCard = memo(({ order, router, getImage }: { order: any; router: any; getImage: (itemId: string, itemName: string) => string | undefined }) => {
  return (
    <div
      onClick={() => router.push(`/store/orders/${order.orderId}`)}
      className="bg-white rounded-2xl p-5 border-2 border-gray-100 flex flex-col cursor-pointer hover:shadow-lg hover:border-primary-300 transition-all"
    >
      {/* Order Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-base font-bold text-gray-900">
            Order #{order.orderId.split('-')[1]}
          </p>
          <span className={`px-3 py-1 text-sm font-bold rounded-lg ${getStatusColor(order.status)}`}>
            {order.status.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <p className="text-sm text-gray-600 font-medium truncate">
            {order.collectionPoint}
          </p>
        </div>
        <p className="text-sm text-gray-400">
          {new Date(order.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>

      {/* Order Items */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative w-12 h-12 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0">
              {getImage(order.items[0].itemId, order.items[0].itemName) ? (
                <img
                  src={getImage(order.items[0].itemId, order.items[0].itemName)}
                  alt={order.items[0].itemName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
            <span className="text-base font-semibold text-gray-900 truncate">
              {order.items[0].itemName}
            </span>
          </div>
          <span className="text-base font-bold text-gray-900 ml-3 flex-shrink-0">
            ×{order.items[0].quantity}
          </span>
        </div>
        {order.items.length > 1 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-sm text-primary-600 font-semibold">
              +{order.items.length - 1} more item{order.items.length - 1 !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Click indicator */}
      <div className="mt-auto pt-3 border-t border-gray-100">
        <p className="text-sm text-gray-500 text-center font-medium">
          Tap to view order timeline
        </p>
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
