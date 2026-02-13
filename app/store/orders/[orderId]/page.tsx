'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Loader2, Package, MapPin, ArrowLeft, Clock, CheckCircle2, Circle } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useUsername } from '../../../../components/UserContext';
import { useEffect } from 'react';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const username = useUsername();
  const orderId = params.orderId as string;

  // Direct query for single order - much faster!
  const order = useQuery(
    api.orders.getByOrderId,
    orderId ? { orderId } : 'skip'
  );

  // Redirect to login if not logged in
  useEffect(() => {
    if (!username) {
      router.push('/login');
    }
  }, [username, router]);

  if (order === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/store/orders')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to Orders</span>
      </button>

      {/* Order Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Order #{order.orderId.split('-')[1]}
            </h1>
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">Collection Point: {order.collectionPoint}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                {new Date(order.createdAt).toLocaleString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
          <div>
            <span
              className={`px-4 py-2 text-sm font-semibold rounded-lg ${getStatusColor(
                order.status
              )}`}
            >
              {order.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Status Timeline</h2>

        <div className="space-y-6">
          {/* Pending */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                order.status === 'pending' || order.status === 'ready' || order.status === 'collected'
                  ? 'bg-yellow-100 border-2 border-yellow-500'
                  : 'bg-gray-100 border-2 border-gray-300'
              }`}>
                {order.status === 'pending' || order.status === 'ready' || order.status === 'collected' ? (
                  <CheckCircle2 className="w-5 h-5 text-yellow-600" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400" />
                )}
              </div>
              {order.status !== 'cancelled' && (
                <div className={`w-0.5 h-16 ${
                  order.status === 'ready' || order.status === 'collected'
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
                }`} />
              )}
            </div>
            <div className="flex-1 pb-8">
              <h3 className="text-sm font-semibold text-gray-900">Order Placed</h3>
              <p className="text-xs text-gray-500 mt-1">
                Your order has been received and is being prepared
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(order.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Ready */}
          {order.status !== 'cancelled' && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  order.status === 'ready' || order.status === 'collected'
                    ? 'bg-blue-100 border-2 border-blue-500'
                    : 'bg-gray-100 border-2 border-gray-300'
                }`}>
                  {order.status === 'ready' || order.status === 'collected' ? (
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                {order.status !== 'ready' && (
                  <div className={`w-0.5 h-16 ${
                    order.status === 'collected'
                      ? 'bg-green-500'
                      : 'bg-gray-300'
                  }`} />
                )}
              </div>
              <div className="flex-1 pb-8">
                <h3 className="text-sm font-semibold text-gray-900">Ready for Collection</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {order.status === 'ready' || order.status === 'collected'
                    ? 'Your order is ready to be collected'
                    : 'Waiting for collection point to prepare your order'}
                </p>
              </div>
            </div>
          )}

          {/* Collected */}
          {order.status !== 'cancelled' && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  order.status === 'collected'
                    ? 'bg-green-100 border-2 border-green-500'
                    : 'bg-gray-100 border-2 border-gray-300'
                }`}>
                  {order.status === 'collected' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">Collected</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {order.status === 'collected'
                    ? 'Your order has been collected. Thank you!'
                    : 'Pending collection'}
                </p>
              </div>
            </div>
          )}

          {/* Cancelled */}
          {order.status === 'cancelled' && (
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-red-100 border-2 border-red-500">
                  <CheckCircle2 className="w-5 h-5 text-red-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">Order Cancelled</h3>
                <p className="text-xs text-gray-500 mt-1">
                  This order has been cancelled
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h2>
        <div className="space-y-3">
          {order.items.map((item: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-900">{item.itemName}</span>
                  <p className="text-xs text-gray-500">Item ID: {item.itemId}</p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                Quantity: <span className="font-semibold text-gray-900">{item.quantity}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    ready: 'bg-blue-100 text-blue-800 border border-blue-200',
    collected: 'bg-green-100 text-green-800 border border-green-200',
    cancelled: 'bg-red-100 text-red-800 border border-red-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
