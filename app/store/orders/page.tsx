'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ClipboardList, Loader2, Package } from 'lucide-react';
import { useUsername } from '../../../components/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, memo } from 'react';

export default function OrdersPage() {
  const router = useRouter();
  const username = useUsername();
  const orders = useQuery(
    api.orders.getByUsername,
    username ? { username } : 'skip'
  );

  // Redirect to login if not logged in
  useEffect(() => {
    if (!username) {
      router.push('/login');
    }
  }, [username, router]);

  if (!orders) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <ClipboardList className="w-20 h-20 text-gray-300 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Orders</h2>
        <p className="text-gray-500">No orders yet</p>
        <p className="text-sm text-gray-400 mt-1">
          Your order history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Orders Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList className="w-5 h-5 text-gray-700" />
          <h1 className="text-sm font-bold text-gray-900">
            My Orders ({orders.length})
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {orders.map((order: any) => (
            <OrderCard key={order.orderId} order={order} router={router} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Memoized OrderCard component for better performance
const OrderCard = memo(({ order, router }: { order: any; router: any }) => {
  return (
    <div
      onClick={() => router.push(`/store/orders/${order.orderId}`)}
      className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex flex-col cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
    >
              {/* Order Header */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-900">
                    #{order.orderId.split('-')[1]}
                  </p>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-1">
                  {order.collectionPoint}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Order Items */}
              <div className="bg-white p-3 rounded-lg border border-gray-200 mb-2">
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Package className="w-3 h-3 text-gray-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-gray-900 truncate">
                      {order.items[0].itemName}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                    Qty: <span className="font-semibold text-gray-900">{order.items[0].quantity}</span>
                  </span>
                </div>
                {order.items.length > 1 && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-blue-600 font-medium">
                      +{order.items.length - 1} more item{order.items.length - 1 !== 1 ? 's' : ''}
                    </p>
                  </div>
                )}
              </div>

              {/* Click indicator */}
              <div className="mt-auto pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Click to view timeline
                </p>
              </div>
    </div>
  );
});

OrderCard.displayName = 'OrderCard';

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    ready: 'bg-blue-100 text-blue-800',
    collected: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
