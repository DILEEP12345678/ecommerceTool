'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ArrowLeft, Loader2, Package, RotateCcw, ShoppingCart, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCollectionPoint, useUser, useUserLoaded } from '../../../components/UserContext';
import { useEffect, useState } from 'react';
import { useLastUpdated } from '../../../lib/useLastUpdated';

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

  const productRows = useQuery(api.products.list);
  const productImageById = new Map<string, string>(
    (productRows ?? []).map((p: any) => [p.productId, p.image])
  );
  const productImageByName = new Map<string, string>(
    (productRows ?? []).map((p: any) => [p.name.toLowerCase(), p.image])
  );
  const getImage = (itemId: string, itemName: string): string | undefined => {
    const baseId = itemId.split(':')[0];
    return productImageById.get(baseId)
      ?? productImageByName.get(itemName.toLowerCase())
      ?? productImageByName.get(itemName.split('(')[0].trim().toLowerCase());
  };

  // ── Tick-off state ───────────────────────────────────────
  const storageKey = `pack-list-checked-${collectionPoint}`;
  const [checked, setChecked] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(storageKey, JSON.stringify(Array.from(checked)));
  }, [checked, storageKey]);

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearAll = () => setChecked(new Set());

  // ── Last updated ─────────────────────────────────────────
  const lastUpdated = useLastUpdated(confirmedItemsList);

  // ── Image zoom ───────────────────────────────────────────
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null);

  const anyChecked = checked.size > 0;

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-6">
      {/* Sticky top bar */}
      <div className="sticky top-14 z-10 bg-white dark:bg-gray-800 shadow-sm px-4 py-3 flex items-center gap-3 border-b border-gray-100 dark:border-gray-700">
        <button
          onClick={() => router.push('/collection-point')}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors -ml-1 flex-shrink-0"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary-500 flex-shrink-0" />
            <h1 className="text-lg font-bold text-gray-900">Pack List</h1>
            {confirmedItemsList !== undefined && (
              <span className="text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">
                {confirmedItemsList.length} products
              </span>
            )}
          </div>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">Updated {lastUpdated}</p>
          )}
        </div>
        {anyChecked && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto">
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
          <div className="space-y-3">
            {confirmedItemsList.map((product: any) => {
              const imgSrc = getImage(product.baseId, product.productName);
              const isProductChecked = product.variants.every((v: any) => checked.has(v.itemId));

              return (
                <div
                  key={product.baseId}
                  className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-opacity duration-200 ${isProductChecked ? 'opacity-50' : ''}`}
                >
                  {/* Product header row */}
                  <div className="flex items-center px-4 py-3.5 gap-3">
                    <div
                      className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 cursor-zoom-in relative group"
                      onClick={() => imgSrc && setZoomed({ src: imgSrc, alt: product.productName })}
                    >
                      {imgSrc ? (
                        <img src={imgSrc} alt={product.productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-bold text-gray-900 ${isProductChecked ? 'line-through text-gray-400' : ''}`}>
                        {product.productName}
                      </p>
                      <p className="text-xs text-gray-400">{product.baseId}</p>
                    </div>
                  </div>

                  {/* Variant sub-rows — always shown */}
                  <div className="border-t border-gray-200/30 divide-y divide-gray-200/30">
                    {product.variants.map((v: any) => {
                      const isVChecked = checked.has(v.itemId);
                      return (
                        <div key={v.itemId} className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2 pl-14">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                            <span className={`text-sm font-medium ${isVChecked ? 'line-through text-gray-300' : 'text-gray-600'}`}>
                              {v.variantLabel || 'Single'}
                            </span>
                          </div>
                          <span className={`text-sm font-bold ${isVChecked ? 'text-gray-300' : 'text-gray-500'}`}>
                            ×{v.quantity}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Image zoom modal */}
      {zoomed && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setZoomed(null)}
        >
          <div className="relative max-w-sm w-full animate-pop-in" onClick={e => e.stopPropagation()}>
            <img src={zoomed.src} alt={zoomed.alt} className="w-full h-auto rounded-2xl shadow-2xl object-cover" />
            <p className="text-white text-sm font-semibold text-center mt-4">{zoomed.alt}</p>
            <button
              onClick={() => setZoomed(null)}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
