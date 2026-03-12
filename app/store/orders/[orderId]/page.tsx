'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Loader2, Package, MapPin, ArrowLeft, Clock, CheckCircle2, Circle } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useUsername, useUserLoaded } from '../../../../components/UserContext';
import { useEffect } from 'react';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const username = useUsername();
  const loaded = useUserLoaded();
  const orderId = params.orderId as string;

  const order = useQuery(api.orders.getByOrderId, orderId ? { orderId } : 'skip');

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

  if (order === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (order === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 text-lg">Order not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 sm:py-6 pb-24 sm:pb-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/store/orders')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-6 transition-colors py-2"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-base font-semibold">Back to My Orders</span>
      </button>

      {/* Order Header */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-5">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              Order #{order.orderId.split('-')[1]}
            </h1>
            <div className="flex items-center gap-2 text-gray-600 mb-2">
              <MapPin className="w-5 h-5 text-gray-400" />
              <span className="text-base">Collection Point: <strong>{order.collectionPoint}</strong></span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Clock className="w-5 h-5 text-gray-400" />
              <span className="text-base">
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
          <span className={`px-4 py-2 text-base font-bold rounded-xl ${getStatusColor(order.status)}`}>
            {order.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Status Timeline */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 mb-5">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Order Status</h2>

        <div className="space-y-2">
          {/* Confirmed */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-yellow-100 border-2 border-yellow-500">
                <CheckCircle2 className="w-6 h-6 text-yellow-600" />
              </div>
              <div className={`w-1 h-14 mt-1 rounded ${
                order.status === 'packed' || order.status === 'collected'
                  ? 'bg-primary-400'
                  : 'bg-gray-200'
              }`} />
            </div>
            <div className="flex-1 pb-6">
              <h3 className="text-base font-bold text-gray-900">Order Confirmed</h3>
              <p className="text-sm text-gray-500 mt-1">
                Your order has been confirmed and is being packed
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {new Date(order.createdAt).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>

          {/* Packed */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                order.status === 'packed' || order.status === 'collected'
                  ? 'bg-blue-100 border-2 border-blue-500'
                  : 'bg-gray-100 border-2 border-gray-300'
              }`}>
                {order.status === 'packed' || order.status === 'collected' ? (
                  <CheckCircle2 className="w-6 h-6 text-blue-600" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div className={`w-1 h-14 mt-1 rounded ${
                order.status === 'collected'
                  ? 'bg-green-400'
                  : 'bg-gray-200'
              }`} />
            </div>
            <div className="flex-1 pb-6">
              <h3 className="text-base font-bold text-gray-900">Packed & Ready</h3>
              <p className="text-sm text-gray-500 mt-1">
                {order.status === 'packed' || order.status === 'collected'
                  ? 'Your order is packed and ready for collection'
                  : 'Waiting for collection point to pack your order'}
              </p>
            </div>
          </div>

          {/* Collected */}
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                order.status === 'collected'
                  ? 'bg-green-100 border-2 border-green-500'
                  : 'bg-gray-100 border-2 border-gray-300'
              }`}>
                {order.status === 'collected' ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-400" />
                )}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900">Collected</h3>
              <p className="text-sm text-gray-500 mt-1">
                {order.status === 'collected'
                  ? 'Your order has been collected. Thank you!'
                  : 'Pending collection'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
        <div className="space-y-3">
          {order.items.map((item: any, index: number) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100"
            >
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  {getImage(item.itemId, item.itemName) ? (
                    <img
                      src={getImage(item.itemId, item.itemName)}
                      alt={item.itemName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-7 h-7 text-gray-400" />
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-base font-semibold text-gray-900">{item.itemName}</span>
                  <p className="text-sm text-gray-500 mt-0.5">{item.itemId}</p>
                </div>
              </div>
              <div className="text-lg font-bold text-gray-900">
                ×{item.quantity}
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
    confirmed: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-200',
    packed: 'bg-blue-100 text-blue-800 border-2 border-blue-200',
    collected: 'bg-green-100 text-green-800 border-2 border-green-200',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
