'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { ChevronDown, Loader2, MapPin, Package, X } from 'lucide-react';
import { useHasRole, useUserLoaded } from '../../../components/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useLastUpdated } from '../../../lib/useLastUpdated';

export default function OrderedItemsPage() {
  const router = useRouter();
  const isAdmin = useHasRole('admin');
  const loaded = useUserLoaded();
  const [selectedCollectionPoint, setSelectedCollectionPoint] = useState<string>('all');
  const [cpOpen, setCpOpen] = useState(false);
  const [zoomed, setZoomed] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!loaded) return;
    if (!isAdmin) router.push('/login');
  }, [isAdmin, router, loaded]);

  const confirmedItemsList = useQuery(api.orders.getConfirmedItemsSummary, {
    collectionPoint: selectedCollectionPoint === 'all' ? undefined : selectedCollectionPoint,
  });

  const collectionPoints = useQuery(api.users.getCollectionPoints) ?? [];

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

  const lastUpdated = useLastUpdated(confirmedItemsList);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-6">

      {/* Filter row */}
      <div className="sticky top-14 z-10 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 shadow-sm px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="relative">
          <button
            onClick={() => setCpOpen(o => !o)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border-2 transition-all ${
              selectedCollectionPoint !== 'all'
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-gray-200 text-gray-500'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{selectedCollectionPoint === 'all' ? 'All Collection Points' : selectedCollectionPoint}</span>
            <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${cpOpen ? 'rotate-180' : ''}`} />
          </button>

          {cpOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setCpOpen(false)} />
              <div className="absolute left-0 top-full mt-2 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 min-w-[240px] animate-fade-in-scale">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">Collection points</p>
                <div className="flex flex-col">
                  {[{ value: 'all', label: 'All Collection Points' }, ...collectionPoints.map(cp => ({ value: cp, label: cp }))].map((item, idx, arr) => (
                    <button
                      key={item.value}
                      onClick={() => { setSelectedCollectionPoint(item.value); setCpOpen(false); }}
                      className={`flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-left transition-colors rounded-xl whitespace-nowrap ${
                        selectedCollectionPoint === item.value ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
                      } ${idx < arr.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${selectedCollectionPoint === item.value ? 'text-primary-500' : 'text-gray-400'}`} />
                        {item.label}
                      </div>
                      {selectedCollectionPoint === item.value && <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {confirmedItemsList !== undefined && (
            <span className="text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">
              {confirmedItemsList.length} products
            </span>
          )}
          {lastUpdated && <p className="text-xs text-gray-400">Updated {lastUpdated}</p>}
        </div>
      </div>

      {/* Product cards */}
      <div className="px-4 pt-4 max-w-7xl mx-auto">
        {confirmedItemsList === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-primary-400 animate-spin" />
          </div>
        ) : confirmedItemsList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-sm">
            <Package className="w-12 h-12 text-gray-200 mb-2" />
            <p className="text-sm font-semibold text-gray-400">No confirmed orders</p>
            <p className="text-xs text-gray-400 mt-1">Items appear here when orders are confirmed</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {confirmedItemsList.map((product: any) => {
              const imgSrc = getImage(product.baseId, product.productName);

              return (
                <div key={product.baseId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
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
                      <p className="text-sm font-bold text-gray-900">{product.productName}</p>
                      <p className="text-xs text-gray-400">{product.baseId}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-200/30 divide-y divide-gray-200/30">
                    {product.variants.map((v: any) => (
                      <div key={v.itemId} className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2 pl-14">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                          <span className="text-sm font-medium text-gray-600">{v.variantLabel || 'Single'}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-500">×{v.quantity}</span>
                      </div>
                    ))}
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
