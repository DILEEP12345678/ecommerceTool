'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ArrowLeft, Loader2, Package, ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCollectionPoint, useUser, useUserLoaded } from '../../../components/UserContext';
import { useEffect } from 'react';

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

export default function PackListPage() {
  const router = useRouter();
  const user = useUser();
  const loaded = useUserLoaded();
  const collectionPoint = useCollectionPoint();

  useEffect(() => {
    if (!loaded) return;
    if (!user || user.role !== 'collection_point_manager') {
      router.push('/login');
    }
  }, [user, router, loaded]);

  const confirmedItemsList = useQuery(
    api.orders.getConfirmedItemsSummary,
    collectionPoint ? { collectionPoint } : 'skip'
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-6">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/collection-point')}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors -ml-1 flex-shrink-0"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <ShoppingCart className="w-5 h-5 text-primary-500" />
          <h1 className="text-lg font-bold text-gray-900">Pack List</h1>
          {confirmedItemsList !== undefined && (
            <span className="text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">
              {confirmedItemsList.length} products
            </span>
          )}
        </div>
      </div>

      <div className="px-4 pt-4">
        {confirmedItemsList === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-primary-400 animate-spin" />
          </div>
        ) : confirmedItemsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-sm">
            <Package className="w-12 h-12 text-gray-200 mb-2" />
            <p className="text-sm font-semibold text-gray-400">No items to pack</p>
            <p className="text-xs text-gray-400 mt-1">All confirmed orders are packed</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {confirmedItemsList.map((item: any, index: number) => (
              <div
                key={item.itemId}
                className={`flex items-center justify-between px-4 py-3.5 ${
                  index < confirmedItemsList.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {PRODUCT_IMAGES[item.itemId] ? (
                      <img
                        src={PRODUCT_IMAGES[item.itemId]}
                        alt={item.itemName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.itemName}</p>
                    <p className="text-xs text-gray-400">{item.itemId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-bold text-primary-600">×{item.quantity}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
