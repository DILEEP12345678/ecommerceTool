'use client';

import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, CheckCircle2, Loader2, Package, ShoppingBag, X } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useHasRole, useUserLoaded } from '../../../../components/UserContext';
import { useTheme } from '../../../../components/ThemeProvider';
import { api } from '../../../../convex/_generated/api';
import { buildBagPlan, type BagEntry, type ProductMeta } from '../../../../lib/bagPlan';
import { useLastUpdated } from '../../../../lib/useLastUpdated';


export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const isManager = useHasRole('collection_point_manager');
  const isAdmin = useHasRole('admin');
  const loaded = useUserLoaded();
  const orderId = params.orderId as string;
  const cpParam = searchParams.get('cp');
  const cpSuffix = cpParam ? `?cp=${encodeURIComponent(cpParam)}` : '';
  const { theme } = useTheme();
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);
  const [packedQty, setPackedQty] = useState<Map<number, number>>(() => {
    if (typeof window === 'undefined') return new Map();
    try {
      const saved = localStorage.getItem(`packed-items-${params.orderId}`);
      if (!saved) return new Map();
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || !Array.isArray(parsed[0])) {
        localStorage.removeItem(`packed-items-${params.orderId}`);
        return new Map();
      }
      return new Map<number, number>(parsed);
    } catch {
      return new Map();
    }
  });

  useEffect(() => {
    if (!orderId) return;
    localStorage.setItem(`packed-items-${orderId}`, JSON.stringify(Array.from(packedQty.entries())));
  }, [packedQty, orderId]);

  const order = useQuery(
    api.orders.getByOrderId,
    orderId ? { orderId } : 'skip'
  );
  const updateStatus = useMutation(api.orders.updateStatus);
  const productRows = useQuery(api.products.list);

  // Build image lookup: by productId and by name (for legacy orders that stored Convex _id as itemId)
  const productImageByName = new Map<string, string>();
  const productImageById = new Map<string, string>();
  for (const p of (productRows ?? []) as any[]) {
    productImageById.set(p.productId, p.image);
    productImageByName.set(p.name.toLowerCase(), p.image);
  }
  const getItemImage = (itemId: string, itemName: string): string | undefined => {
    const baseId = itemId.split(':')[0];
    return productImageById.get(baseId)
      ?? productImageByName.get(itemName.toLowerCase())
      ?? productImageByName.get(itemName.split('(')[0].trim().toLowerCase());
  };

  // Build productId → { weightG, sensitivity } map for bagPlan
  // Also add variant-keyed entries so PROD-005:12 Pack uses the variant's weightG
  const productMap = new Map<string, ProductMeta>();
  for (const p of (productRows ?? []) as any[]) {
    for (const v of (p.variants ?? [])) {
      productMap.set(`${p.productId}:${v.label}`, { weightG: v.weightG, sensitivity: p.sensitivity });
    }
    // Also register base productId using first variant weight as fallback
    if (p.variants?.length) {
      productMap.set(p.productId, { weightG: p.variants[0].weightG, sensitivity: p.sensitivity });
    }
  }

  useEffect(() => {
    if (!loaded) return;
    if (!isManager && !isAdmin) router.push('/login');
  }, [isManager, isAdmin, router, loaded]);

  const lastUpdated = useLastUpdated(order);
  const [timeAgo, setTimeAgo] = useState('');
  useEffect(() => {
    if (!order) return;
    const diff = Date.now() - order.createdAt;
    const mins = Math.floor(diff / 60000);
    if (mins < 60) { setTimeAgo(`${mins}m ago`); return; }
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) { setTimeAgo(`${hrs}h ago`); return; }
    setTimeAgo(`${Math.floor(hrs / 24)}d ago`);
  }, [order]);

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

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus({
        orderId: order.orderId,
        status: newStatus as any,
      });
      const msg = newStatus === 'packed' ? 'Marked as Packed!' : 'Marked as Collected!';
      setFlashMessage(msg);
      setTimeout(() => {
        if (newStatus === 'packed') {
          localStorage.removeItem(`packed-items-${order.orderId}`);
          setPackedQty(new Map());
          router.push(`/collection-point${cpSuffix}`);
        } else if (newStatus === 'collected') {
          const sep = cpSuffix ? '&' : '?';
          router.push(`/collection-point${cpSuffix}${sep}tab=packed`);
        }
      }, 700);
    } catch {
      toast.error('Failed to update order status. Please try again.');
    }
  };

  const allComplete =
    order.status === 'confirmed' &&
    order.items.length > 0 &&
    order.items.every((_: any, i: number) => (packedQty.get(i) ?? 0) >= order.items[i].quantity);

  const packedCount = order.items.filter(
    (_: any, i: number) => (packedQty.get(i) ?? 0) >= order.items[i].quantity
  ).length;


  return (
    <div className="flex flex-col bg-gray-50 dark:bg-[#1a1c19] h-[calc(100vh-7.5rem)] sm:h-[calc(100vh-3.5rem)]">
      {/* Fixed top bar */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors -ml-1 flex-shrink-0"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-gray-900">
              Order #{order.orderId.split('-')[1]}
            </h1>
            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full flex-shrink-0 ${getStatusBadge(order.status)}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate">
            {order.username} · {timeAgo}
            {lastUpdated && <span className="ml-1 text-gray-400">· Updated {lastUpdated}</span>}
          </p>
        </div>
      </div>

      {/* Single scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
      <div className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex gap-4 items-start">

        {/* ── LEFT: items section ─────────────────────────── */}
        <div className="flex-[5] min-w-0 flex flex-col gap-3">

        {/* All-packed success banner */}
        {order.status === 'confirmed' && allComplete && (
          <div className="flex items-center gap-3 bg-green-50 border-2 border-green-200 rounded-2xl px-4 py-3 animate-fade-in">
            <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-bold text-green-800">All items packed!</p>
              <p className="text-xs text-green-600">Tap "Mark as Packed" below to confirm.</p>
            </div>
          </div>
        )}

        {/* Bag plan — mobile only */}
        {order.status === 'confirmed' && (() => {
          const bagPlan = buildBagPlan(order.items, productMap);
          return <BagPlanPanel bagPlan={bagPlan} className="sm:hidden" />;
        })()}

        {/* Items box */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <Package className="w-4 h-4 text-primary-500" />
            <h3 className="text-sm font-bold text-gray-900">Order Items</h3>
            <span className="ml-auto text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">
              {new Set(order.items.map((i: any) => i.itemId.split(':')[0])).size} product{new Set(order.items.map((i: any) => i.itemId.split(':')[0])).size !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(() => {
            // Build item → bag mapping
            const itemBagMap = new Map<string, Array<{ bagNo: number; qty: number; entry: BagEntry }>>();
            if (order.status === 'confirmed') {
              const bagPlan = buildBagPlan(order.items, productMap);
              for (const bag of bagPlan) {
                for (const bagItem of bag.items) {
                  if (!itemBagMap.has(bagItem.itemId)) itemBagMap.set(bagItem.itemId, []);
                  itemBagMap.get(bagItem.itemId)!.push({ bagNo: bag.bagNo, qty: bagItem.quantity, entry: bag });
                }
              }
            }

            // Sort by lowest bag number, preserving originalIndex for packedQty
            const sortedItems = order.items
              .map((item: any, idx: number) => ({ item, originalIndex: idx }))
              .sort((a: any, b: any) => {
                const aMin = Math.min(...(itemBagMap.get(a.item.itemId)?.map((x: any) => x.bagNo) ?? [Infinity]));
                const bMin = Math.min(...(itemBagMap.get(b.item.itemId)?.map((x: any) => x.bagNo) ?? [Infinity]));
                return aMin - bMin;
              });

            // Group by base product ID
            type Group = { baseId: string; baseName: string; imgSrc: string | undefined; variants: Array<{ item: any; originalIndex: number }> };
            const groups: Group[] = [];
            const groupMap = new Map<string, Group>();
            for (const { item, originalIndex } of sortedItems) {
              const baseId = item.itemId.split(':')[0];
              const baseName = item.itemName.includes('(')
                ? item.itemName.slice(0, item.itemName.lastIndexOf('(')).trim()
                : item.itemName;
              if (!groupMap.has(baseId)) {
                const g: Group = { baseId, baseName, imgSrc: getItemImage(item.itemId, item.itemName), variants: [] };
                groupMap.set(baseId, g);
                groups.push(g);
              }
              groupMap.get(baseId)!.variants.push({ item, originalIndex });
            }

            return groups.map((group) => {
              const totalQty = group.variants.reduce((s, { item }) => s + item.quantity, 0);
              const totalPacked = group.variants.reduce((s, { item, originalIndex: idx }) => s + Math.min(packedQty.get(idx) ?? 0, item.quantity), 0);
              const anyPacked = totalPacked > 0;
              const allGroupComplete = totalPacked >= totalQty;
              const groupPct = totalQty > 0 ? totalPacked / totalQty : 0;

              const tileStyle = order.status !== 'confirmed' || !anyPacked
                ? 'bg-white border-transparent'
                : allGroupComplete
                ? 'bg-green-50 border-green-300'
                : groupPct <= 0.33
                ? 'bg-red-50 border-red-200'
                : groupPct <= 0.66
                ? 'bg-orange-50 border-orange-200'
                : 'bg-yellow-50 border-yellow-200';

              return (
                <div key={group.baseId} className={`rounded-2xl shadow-sm border-2 overflow-hidden transition-all duration-300 flex flex-col ${tileStyle}`}>
                  {/* Product image */}
                  <div
                    className="relative aspect-square bg-gray-100 cursor-zoom-in"
                    onClick={() => group.imgSrc && setZoomedImage({ src: group.imgSrc, alt: group.baseName })}
                  >
                    {group.imgSrc
                      ? <img src={group.imgSrc} alt={group.baseName} className="w-full h-full object-contain" />
                      : <div className="w-full h-full flex items-center justify-center"><Package className="w-10 h-10 text-gray-300" /></div>
                    }
                    {allGroupComplete && order.status === 'confirmed' && (
                      <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                        <CheckCircle2 className="w-10 h-10 text-green-500 drop-shadow" />
                      </div>
                    )}
                    {/* Product name overlay at bottom of image */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-2">
                      <p className="text-white text-sm font-bold leading-tight">{group.baseName}</p>
                    </div>
                  </div>

                  {/* Tappable variant buttons */}
                  <div className="p-1.5 flex flex-col gap-1">
                    {group.variants.map(({ item, originalIndex: index }) => {
                      const packed = packedQty.get(index) ?? 0;
                      const isComplete = packed >= item.quantity;
                      const variantLabel = item.itemId.includes(':') ? item.itemId.split(':').slice(1).join(':') : 'Single';
                      const isConfirmed = order.status === 'confirmed';
                      const bagAssignments = itemBagMap.get(item.itemId) ?? [];

                      return (
                        <button
                          key={index}
                          type="button"
                          disabled={!isConfirmed}
                          onClick={() => {
                            setPackedQty(prev => {
                              const next = new Map(prev);
                              next.set(index, isComplete ? 0 : item.quantity);
                              return next;
                            });
                          }}
                          className={`w-full flex px-2 py-1.5 rounded-lg border-2 font-semibold text-xs transition-all duration-150 active:scale-95 text-left ${
                            isComplete && isConfirmed
                              ? 'bg-green-500 border-green-500 text-white'
                              : isConfirmed
                              ? 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:border-primary-300 hover:bg-primary-50 dark:hover:bg-primary-900/30'
                              : 'bg-gray-50 dark:bg-gray-700/50 border-transparent text-gray-800 dark:text-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="break-words">{variantLabel}</span>
                              {bagAssignments.map((a, i) => (
                                <span
                                  key={i}
                                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                    isComplete && isConfirmed ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                                  }`}
                                >
                                  Bag {a.bagNo}
                                </span>
                              ))}
                            </div>
                            <span className={`text-xs font-bold flex-shrink-0 ${isComplete && isConfirmed ? 'text-green-100' : 'text-gray-400'}`}>
                              ×{item.quantity}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
          </div>
        </div>{/* end items box */}

        </div>{/* end left column */}

        {/* RIGHT: sticky bag plan (sm+ only) */}
        {order.status === 'confirmed' && (() => {
          const bagPlan = buildBagPlan(order.items, productMap);
          if (bagPlan.length === 0) return null;
          return (
            <div className="hidden sm:block flex-[2] sticky top-0 max-h-[calc(100vh-14rem)] overflow-y-auto no-scrollbar">
              <BagPlanPanel bagPlan={bagPlan} />
            </div>
          );
        })()}

      </div>{/* end flex */}
      </div>{/* end max-w */}
      </div>{/* end scrollable */}

      {/* Footer action bar — fixed at bottom of flex column */}
      <div className="flex-shrink-0 bg-white dark:bg-[#272a25] border-t border-gray-100 dark:border-gray-700 shadow-lg px-4 py-3">
        <div className="max-w-2xl mx-auto">
          {order.status === 'confirmed' && (
            <div className="flex flex-col gap-2">
              {!allComplete && (
                <p className="text-center text-sm text-gray-400">
                  {packedCount} of {order.items.length} items packed
                </p>
              )}
              <button
                onClick={() => handleStatusChange('packed')}
                disabled={!allComplete}
                className={`w-full py-4 rounded-xl text-base font-bold transition-all ${
                  allComplete
                    ? 'bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                }`}
              >
                {allComplete ? 'Mark as Packed ✓' : 'Mark as Packed'}
              </button>
            </div>
          )}

          {order.status === 'packed' && (
            <button
              onClick={() => handleStatusChange('collected')}
              className="w-full py-4 bg-green-500 hover:bg-green-600 active:scale-[0.98] text-white rounded-xl text-base font-bold transition-all shadow-sm"
            >
              Mark Collected
            </button>
          )}

          {order.status === 'collected' && (
            <div className="flex items-center justify-center gap-2 py-3.5 bg-green-50 rounded-xl border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-bold text-green-700">Order has been collected</span>
            </div>
          )}
        </div>
      </div>

      {/* Success flash overlay */}
      {flashMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none animate-success-flash">
          <div className="flex flex-col items-center gap-3 bg-green-500 text-white px-10 py-8 rounded-3xl shadow-2xl">
            <CheckCircle2 className="w-14 h-14" />
            <p className="text-xl font-bold">{flashMessage}</p>
          </div>
        </div>
      )}

      {/* Image zoom modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-w-lg w-full animate-pop-in"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={zoomedImage.src}
              alt={zoomedImage.alt}
              className="w-full h-auto rounded-2xl shadow-2xl object-cover"
            />
            <p className="text-white text-base font-semibold text-center mt-4">{zoomedImage.alt}</p>
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Close image"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BagPlanPanel({ bagPlan, className = '' }: { bagPlan: BagEntry[]; className?: string }) {
  if (bagPlan.length === 0) return null;
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col ${className}`}>
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
        <ShoppingBag className="w-5 h-5 text-primary-500" />
        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">Bag Plan</h3>
        <span className="ml-auto text-sm bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-bold px-2.5 py-0.5 rounded-full">
          {bagPlan.length} bag{bagPlan.length !== 1 ? 's' : ''}
        </span>
      </div>
      {/* Pack-order legend */}
      <div className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">Pack order:</span>
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">1 → bottom · last → top</span>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {bagPlan.map((bag) => (
          <div key={bag.bagNo} className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">Bag {bag.bagNo}</span>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                ~{bag.weightG >= 1000 ? `${(bag.weightG / 1000).toFixed(1)}kg` : `${bag.weightG}g`}
              </span>
            </div>
            <div className="space-y-2.5">
              {bag.items.map((item: any, i: number) => {
                const isFirst = i === 0;
                const isLast = i === bag.items.length - 1;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-500 dark:text-gray-400 flex-shrink-0 w-5">{i + 1}.</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100 flex-1">{item.itemName}</span>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 flex-shrink-0">×{item.quantity}</span>
                    {isFirst && bag.items.length > 1 && (
                      <span className="text-xs font-bold text-white bg-gray-500 dark:bg-gray-400 px-2 py-0.5 rounded-full flex-shrink-0">bottom</span>
                    )}
                    {isLast && bag.items.length > 1 && (
                      <span className="text-xs font-bold text-white bg-primary-500 dark:bg-primary-400 px-2 py-0.5 rounded-full flex-shrink-0">top</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    confirmed: 'bg-yellow-100 text-yellow-800',
    packed: 'bg-blue-100 text-blue-800',
    collected: 'bg-green-100 text-green-800',
  };
  return styles[status] || 'bg-gray-100 text-gray-800';
}
