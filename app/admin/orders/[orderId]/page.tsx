'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { Loader2, Package, User, MapPin, ArrowLeft, Clock, CheckCircle2, Circle } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useHasRole, useUserLoaded } from '../../../../components/UserContext';
import { useEffect } from 'react';

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const isAdmin = useHasRole('admin');
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
    if (!isAdmin) router.push('/login');
  }, [isAdmin, router, loaded]);

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

  const productMap = new Map<string, { baseId: string; productName: string; imgSrc: string | undefined; variants: { itemId: string; variantLabel: string; quantity: number }[] }>();
  for (const item of order.items as any[]) {
    const baseId = item.itemId.split(':')[0];
    const variantLabel = item.itemId.includes(':') ? item.itemId.split(':').slice(1).join(':') : '';
    const productName = item.itemName.includes('(') ? item.itemName.slice(0, item.itemName.lastIndexOf('(')).trim() : item.itemName;
    if (!productMap.has(baseId)) {
      productMap.set(baseId, { baseId, productName, imgSrc: getImage(item.itemId, item.itemName), variants: [] });
    }
    productMap.get(baseId)!.variants.push({ itemId: item.itemId, variantLabel, quantity: item.quantity });
  }
  const products = Array.from(productMap.values());

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Back button */}
      <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 pt-4 pb-2 flex-shrink-0">
        <button
          onClick={() => router.push('/admin')}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Back to Dashboard</span>
        </button>
      </div>

      {/* Two-column body */}
      <div className="flex flex-1 gap-3 max-w-4xl mx-auto w-full px-4 sm:px-6 pb-4 min-h-0">

        {/* ── LEFT: summary + timeline (fixed, no scroll) ── */}
        <div className="w-full sm:w-64 flex-shrink-0 flex flex-col gap-3 overflow-hidden">

          {/* Order summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-start justify-between mb-3">
              <h1 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Order #{order.orderId.split('-')[1]}
              </h1>
              <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${getStatusColor(order.status)}`}>
                {order.status.toUpperCase()}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-700 dark:text-gray-300"><strong>{order.username}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-700 dark:text-gray-300">{order.collectionPoint}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(order.createdAt).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Status timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">Order Status</h2>
            <div className="space-y-2">
              {/* Confirmed */}
              <div className="flex gap-2">
                <div className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center bg-yellow-100 border-2 border-yellow-500">
                    <CheckCircle2 className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className={`w-0.5 h-8 mt-1 rounded ${order.status === 'packed' || order.status === 'collected' ? 'bg-primary-400' : 'bg-gray-200 dark:bg-gray-600'}`} />
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Order Confirmed</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {new Date(order.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Packed */}
              <div className="flex gap-2">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${order.status === 'packed' || order.status === 'collected' ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'}`}>
                    {order.status === 'packed' || order.status === 'collected'
                      ? <CheckCircle2 className="w-4 h-4 text-blue-600" />
                      : <Circle className="w-4 h-4 text-gray-400" />}
                  </div>
                  <div className={`w-0.5 h-8 mt-1 rounded ${order.status === 'collected' ? 'bg-green-400' : 'bg-gray-200 dark:bg-gray-600'}`} />
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Packed & Ready</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {order.status === 'packed' || order.status === 'collected' ? 'Ready for collection' : 'Awaiting packing'}
                  </p>
                </div>
              </div>

              {/* Collected */}
              <div className="flex gap-2">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center ${order.status === 'collected' ? 'bg-green-100 border-2 border-green-500' : 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'}`}>
                    {order.status === 'collected'
                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                      : <Circle className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-900 dark:text-gray-100">Collected</p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                    {order.status === 'collected' ? 'Collected by customer' : 'Pending collection'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT: order items (scrollable, no scrollbar) ── */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col min-h-0 flex-1">
            <div className="px-5 pt-5 pb-3 flex-shrink-0 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">Order Items</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'none' }}>
              {products.map((product) => (
                <div key={product.baseId} className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-600">
                  <div className="flex items-center px-4 py-3.5 gap-3">
                    <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-600 flex-shrink-0">
                      {product.imgSrc ? (
                        <img src={product.imgSrc} alt={product.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{product.productName}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{product.baseId}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200/50 dark:border-gray-600/50 divide-y divide-gray-200/50 dark:divide-gray-600/50">
                    {product.variants.map((v) => (
                      <div key={v.itemId} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2 pl-14">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-500 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{v.variantLabel || 'Single'}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">×{v.quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    confirmed: 'bg-yellow-100 text-yellow-800 border-2 border-yellow-200 dark:bg-amber-500 dark:text-white dark:border-amber-400',
    packed:    'bg-blue-100 text-blue-800 border-2 border-blue-200 dark:bg-blue-500 dark:text-white dark:border-blue-400',
    collected: 'bg-green-100 text-green-800 border-2 border-green-200 dark:bg-green-600 dark:text-white dark:border-green-500',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100';
}
