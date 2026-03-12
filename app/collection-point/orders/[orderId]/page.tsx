'use client';

import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, CheckCircle2, Loader2, Package, ShoppingBag, X } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useUser, useUserLoaded } from '../../../../components/UserContext';
import { api } from '../../../../convex/_generated/api';
import { buildBagPlan, type BagEntry, type ProductMeta } from '../../../../lib/bagPlan';


export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const user = useUser();
  const loaded = useUserLoaded();
  const orderId = params.orderId as string;
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);
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
    productMap.set(p.productId, { weightG: p.weightG, sensitivity: p.sensitivity });
    for (const v of (p.variants ?? [])) {
      productMap.set(`${p.productId}:${v.label}`, { weightG: v.weightG, sensitivity: p.sensitivity });
    }
  }

  useEffect(() => {
    if (!loaded) return;
    if (!user || user.role !== 'collection_point_manager') {
      router.push('/login');
    }
  }, [user, router, loaded]);

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
      if (newStatus === 'packed') {
        localStorage.removeItem(`packed-items-${order.orderId}`);
        setPackedQty(new Map());
        router.push('/collection-point');
      } else if (newStatus === 'collected') {
        router.push('/collection-point?tab=packed');
      }
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
    <div className="flex flex-col bg-gray-50 h-[calc(100vh-7.5rem)] sm:h-[calc(100vh-3.5rem)]">
      {/* Fixed top bar */}
      <div className="flex-shrink-0 bg-white shadow-sm px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={() => router.push(order.status === 'confirmed' ? '/collection-point' : `/collection-point?tab=${order.status}`)}
          className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors -ml-1 flex-shrink-0"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
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
          <p className="text-xs text-gray-500 truncate">{order.username} · {timeAgo}</p>
        </div>
      </div>

      {/* Single scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
      <div className="max-w-5xl mx-auto px-6 py-4">
      <div className="flex gap-4 items-stretch">

        {/* ── LEFT: items section ─────────────────────────── */}
        <div className="flex-[3] min-w-0 flex flex-col gap-3">

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
              {order.items.length} item{order.items.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="p-3 space-y-3">
          {(() => {
            // Build item → bag mapping once for all cards
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
            // Sort by lowest bag number; preserve originalIndex so packedQty stays correct
            const sortedItems = order.items
              .map((item: any, idx: number) => ({ item, originalIndex: idx }))
              .sort((a: any, b: any) => {
                const aMin = Math.min(...(itemBagMap.get(a.item.itemId)?.map((x: any) => x.bagNo) ?? [Infinity]));
                const bMin = Math.min(...(itemBagMap.get(b.item.itemId)?.map((x: any) => x.bagNo) ?? [Infinity]));
                return aMin - bMin;
              });
            return sortedItems.map(({ item, originalIndex: index }: any) => {
            const packed = packedQty.get(index) ?? 0;
            const total = item.quantity;
            const isComplete = packed >= total;
            const pct = total > 0 ? packed / total : 0;
            const bagAssignments = itemBagMap.get(item.itemId) ?? [];

            const tileStyle = order.status !== 'confirmed' || packed === 0
              ? 'bg-white border-transparent'
              : isComplete
              ? 'bg-green-50 border-green-300'
              : pct <= 0.33
              ? 'bg-red-50 border-red-200'
              : pct <= 0.66
              ? 'bg-orange-50 border-orange-200'
              : 'bg-yellow-50 border-yellow-200';

            return (
              <div
                key={index}
                className={`rounded-2xl shadow-sm border-2 overflow-hidden transition-all duration-300 ${tileStyle}`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Product image */}
                    {(() => {
                      const imgSrc = getItemImage(item.itemId, item.itemName);
                      return (
                        <div
                          className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 cursor-zoom-in"
                          onClick={() => imgSrc && setZoomedImage({ src: imgSrc, alt: item.itemName })}
                        >
                          {imgSrc ? (
                            <img src={imgSrc} alt={item.itemName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Name + ID + complete badge */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-base font-bold leading-tight ${isComplete ? 'text-green-700' : 'text-gray-900'}`}>
                            {item.itemName}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{item.itemId}</p>
                          {/* Bag indicators */}
                          {bagAssignments.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {bagAssignments.map((a, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-700"
                                >
                                  Bag {a.bagNo}
                                  {bagAssignments.length > 1 && <span className="text-gray-500 font-normal">×{a.qty}</span>}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        {isComplete && (
                          <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                        )}
                      </div>

                      {order.status !== 'confirmed' && (
                        <p className="text-sm font-semibold text-gray-600 mt-2">Qty: {total}</p>
                      )}
                    </div>
                  </div>

                  {/* Quantity circles — confirmed only */}
                  {order.status === 'confirmed' && (
                    <div className="mt-3 flex flex-wrap gap-2 items-center">
                      {Array.from({ length: total }).map((_, dotIdx) => {
                        const isFilled = dotIdx < packed;
                        const posPct = total === 1 ? 100 : (dotIdx / (total - 1)) * 100;
                        const color = posPct <= 25 ? '#ef4444'
                          : posPct <= 50 ? '#f97316'
                          : posPct <= 75 ? '#facc15'
                          : '#22c55e';
                        return (
                          <div
                            key={dotIdx}
                            onClick={() => {
                              const newCount = isFilled ? dotIdx : dotIdx + 1;
                              setPackedQty(prev => {
                                const next = new Map(prev);
                                next.set(index, newCount);
                                return next;
                              });
                            }}
                            role="button"
                            aria-label={`Unit ${dotIdx + 1}: ${isFilled ? 'packed' : 'not packed'}`}
                            style={{
                              width: '24px',
                              height: '24px',
                              minWidth: '24px',
                              maxWidth: '24px',
                              borderRadius: '50%',
                              border: `2px solid ${color}`,
                              backgroundColor: isFilled ? color : '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              fontWeight: 700,
                              fontSize: '10px',
                              color: isFilled ? '#fff' : color,
                              boxSizing: 'border-box',
                              cursor: 'pointer',
                              userSelect: 'none',
                            }}
                          >
                            {dotIdx + 1}
                          </div>
                        );
                      })}
                      <span className="text-sm font-semibold text-gray-400 ml-1">{packed}/{total}</span>
                    </div>
                  )}
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
            <div className="hidden sm:flex flex-[2] flex-col">
              <BagPlanPanel bagPlan={bagPlan} className="flex-1 overflow-y-auto no-scrollbar" />
            </div>
          );
        })()}

      </div>{/* end flex */}
      </div>{/* end max-w */}
      </div>{/* end scrollable */}

      {/* Footer action bar — fixed at bottom of flex column */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 shadow-lg px-4 py-3">
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
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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

      {/* Image zoom modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-w-lg w-full animate-fade-in-scale"
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
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col ${className}`}>
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <ShoppingBag className="w-4 h-4 text-primary-500" />
        <h3 className="text-sm font-bold text-gray-900">Bag Plan</h3>
        <span className="ml-auto text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">
          {bagPlan.length} bag{bagPlan.length !== 1 ? 's' : ''}
        </span>
      </div>
      {/* Pack-order legend */}
      <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-xs text-gray-400">Pack order:</span>
        <span className="text-xs font-semibold text-gray-500">1 → bottom</span>
        <span className="text-xs text-gray-300 mx-0.5">·</span>
        <span className="text-xs font-semibold text-gray-500">last → top</span>
      </div>
      <div className="divide-y divide-gray-100">
        {bagPlan.map((bag) => (
          <div key={bag.bagNo} className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">Bag {bag.bagNo}</span>
              <span className="text-xs text-gray-400">
                ~{bag.weightG >= 1000 ? `${(bag.weightG / 1000).toFixed(1)}kg` : `${bag.weightG}g`}
              </span>
            </div>
            <div className="space-y-1.5">
              {bag.items.map((item: any, i: number) => {
                const isFirst = i === 0;
                const isLast = i === bag.items.length - 1;
                return (
                  <div key={i} className="flex items-center gap-2">
                    {/* Step number */}
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-xs text-gray-700 font-medium flex-1 truncate">{item.itemName}</span>
                    <span className="text-xs font-bold text-gray-500 flex-shrink-0">×{item.quantity}</span>
                    {/* Position hint */}
                    {isFirst && bag.items.length > 1 && (
                      <span className="text-xs text-gray-400 flex-shrink-0">bottom</span>
                    )}
                    {isLast && bag.items.length > 1 && (
                      <span className="text-xs text-gray-400 flex-shrink-0">top</span>
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
