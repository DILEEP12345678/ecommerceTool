'use client';

import { useState, useEffect } from 'react';
import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Plus, Minus, Loader2, Package, MapPin, ShoppingBag, ShoppingCart, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUserId, useUsername, useCollectionPoint } from '../../components/UserContext';

interface CartItem {
  cartKey: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  variantLabel?: string;
}

function formatPrice(pence: number) {
  return `£${(pence / 100).toFixed(2)}`;
}

export default function HomePage() {
  const userId = useUserId();
  const username = useUsername();
  const userCollectionPoint = useCollectionPoint();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedCollectionPoint, setSelectedCollectionPoint] = useState(userCollectionPoint || '');
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [cpOpen, setCpOpen] = useState(false);

  const products = useQuery(api.products.list);
  const collectionPoints = useQuery(api.users.getCollectionPoints);
  const createOrder = useMutation(api.orders.create);

  React.useEffect(() => {
    if (userCollectionPoint && !selectedCollectionPoint) {
      setSelectedCollectionPoint(userCollectionPoint);
    }
  }, [userCollectionPoint, selectedCollectionPoint]);

  // Initialise selected variant to first option per product
  useEffect(() => {
    if (!products) return;
    setSelectedVariants(prev => {
      const next = { ...prev };
      products.forEach((p: any) => {
        if (p.variants?.length && !next[p.productId]) {
          next[p.productId] = p.variants[0].label;
        }
      });
      return next;
    });
  }, [products]);

  const getItemQuantity = (cartKey: string) =>
    cart.find(i => i.cartKey === cartKey)?.quantity ?? 0;

  const getTotalForProduct = (productId: string) =>
    cart.filter(i => i.productId === productId).reduce((s, i) => s + i.quantity, 0);

  const updateQuantity = (
    cartKey: string, productId: string, name: string,
    price: number, newQty: number, variantLabel?: string
  ) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(i => i.cartKey !== cartKey));
    } else {
      setCart(prev => {
        const existing = prev.find(i => i.cartKey === cartKey);
        if (existing) return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: newQty } : i);
        return [...prev, { cartKey, productId, name, quantity: newQty, price, variantLabel }];
      });
    }
  };

  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const totalPrice = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Please add items to your order first'); return; }
    if (!username) { toast.error('Please login to place an order'); return; }
    if (!selectedCollectionPoint) { toast.error('Please select a collection point'); return; }
    try {
      await createOrder({
        items: cart.map(item => ({ itemId: item.cartKey, itemName: item.name, quantity: item.quantity })),
        username,
        collectionPoint: selectedCollectionPoint,
      });
      toast.success('Order placed successfully!');
      setCart([]);
      setShowCheckout(false);
    } catch {
      toast.error('Failed to place order. Please try again.');
    }
  };

  if (!products) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 pb-48 sm:pb-32">
      {/* Header */}
      <div className="mb-5">
        <p className="text-gray-500 text-sm mb-0.5">Hello, {username || 'Guest'} 👋</p>
        <h1 className="text-xl font-bold text-gray-900 mb-4">What would you like to order?</h1>

        {/* Collection Point — bubble picker */}
        <div className="relative inline-block">
          <button
            onClick={() => setCpOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold shadow-sm border-2 transition-all ${
              selectedCollectionPoint
                ? 'bg-primary-50 border-primary-300 text-primary-700 hover:border-primary-400'
                : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
            }`}
          >
            {!collectionPoints ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            )}
            <span>{selectedCollectionPoint || 'Select collection point'}</span>
            <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform duration-200 ${cpOpen ? 'rotate-180' : ''}`} />
          </button>

          {cpOpen && collectionPoints && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setCpOpen(false)} />
              <div className="absolute left-0 top-full mt-2 z-20 bg-white rounded-2xl shadow-xl border border-gray-100 p-3 min-w-[220px] animate-fade-in-scale">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 px-1">
                  Collection points
                </p>
                <div className="flex flex-col">
                  {collectionPoints.map((p, idx) => (
                    <button
                      key={p}
                      onClick={() => { setSelectedCollectionPoint(p); setCpOpen(false); }}
                      className={`flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-left transition-colors rounded-xl whitespace-nowrap ${
                        selectedCollectionPoint === p
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      } ${idx < collectionPoints.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className={`w-3.5 h-3.5 flex-shrink-0 ${selectedCollectionPoint === p ? 'text-primary-500' : 'text-gray-400'}`} />
                        {p}
                      </div>
                      {selectedCollectionPoint === p && (
                        <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Products Grid — Amazon-style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {(() => {
          const isOOS = (p: any) => p.available === false || (selectedCollectionPoint && (p.collectionPoints ?? []).length > 0 && !(p.collectionPoints ?? []).includes(selectedCollectionPoint));
          const sorted = [...products].sort((a: any, b: any) => (isOOS(a) ? 1 : 0) - (isOOS(b) ? 1 : 0));
          const firstOOSIdx = sorted.findIndex((p: any) => isOOS(p));
          const nodes: React.ReactNode[] = [];
          sorted.forEach((product: any, index: number) => {
            if (index === firstOOSIdx && firstOOSIdx > 0) {
              nodes.push(
                <div key="oos-divider" className="col-span-full flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">Not available at this location</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              );
            }
            nodes.push((() => {
          const hasVariants = product.variants?.length > 0;
          const selectedLabel = selectedVariants[product.productId] ?? product.variants?.[0]?.label;
          const selectedVariant = product.variants?.find((v: any) => v.label === selectedLabel);
          const displayPrice = hasVariants ? (selectedVariant?.price ?? product.price) : product.price;
          const cartKey = hasVariants ? `${product.productId}:${selectedLabel}` : product.productId;
          const qty = getItemQuantity(cartKey);
          const totalInCart = hasVariants ? getTotalForProduct(product.productId) : qty;
          const cpList: string[] = product.collectionPoints ?? [];
          const notAtThisCP = selectedCollectionPoint !== '' && cpList.length > 0 && !cpList.includes(selectedCollectionPoint);
          const outOfStock = product.available === false || notAtThisCP;

          return (
            <div
              key={product.productId}
              className={`bg-white border rounded-2xl overflow-hidden flex flex-col transition-shadow ${outOfStock ? 'border-gray-200 opacity-50' : 'border-gray-200 hover:shadow-md'}`}
            >
              {/* Square image */}
              <div className="relative aspect-square bg-gray-50 p-2">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-full object-contain"
                  onError={e => {
                    e.currentTarget.style.display = 'none';
                    const fb = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fb) fb.classList.remove('hidden');
                  }}
                />
                <div className="hidden absolute inset-0 flex items-center justify-center">
                  <Package className="w-10 h-10 text-gray-300" />
                </div>
                {totalInCart > 0 && (
                  <div key={totalInCart} className="absolute top-1.5 right-1.5 w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center animate-badge-bounce">
                    <span className="text-white text-[10px] font-bold">{totalInCart}</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-2.5 flex flex-col flex-1">
                {/* Name */}
                <h3 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2 leading-snug mb-1">
                  {product.name}
                </h3>

                {/* Price */}
                <div className="mb-2">
                  <span className="text-base sm:text-lg font-bold text-gray-900">
                    {displayPrice != null ? formatPrice(displayPrice) : '—'}
                  </span>
                  {!hasVariants && product.unit && (
                    <span className="text-xs text-gray-400 ml-1">/ {product.unit}</span>
                  )}
                </div>

                {/* Variant pills */}
                {hasVariants && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {product.variants.map((v: any) => (
                      <button
                        key={v.label}
                        onClick={() => setSelectedVariants(prev => ({ ...prev, [product.productId]: v.label }))}
                        className={`px-2 py-1 text-[11px] rounded-lg border transition-colors ${
                          selectedLabel === v.label
                            ? 'border-primary-500 bg-primary-50 text-primary-700 font-semibold'
                            : 'border-gray-200 text-gray-500 hover:border-gray-400'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Add to cart / qty controls */}
                {outOfStock ? (
                  <div className="w-full py-1.5 bg-gray-100 text-gray-400 rounded-lg text-xs font-semibold text-center cursor-not-allowed">
                    Out of stock
                  </div>
                ) : qty === 0 ? (
                  <button
                    onClick={() => {
                      if (hasVariants && selectedVariant) {
                        const key = `${product.productId}:${selectedLabel}`;
                        const name = `${product.name} (${selectedLabel})`;
                        updateQuantity(key, product.productId, name, selectedVariant.price, 1, selectedLabel);
                      } else {
                        updateQuantity(product.productId, product.productId, product.name, product.price ?? 0, 1);
                      }
                    }}
                    className="w-full py-1.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    Add to cart
                  </button>
                ) : (
                  <div className="flex items-center rounded-lg overflow-hidden border border-primary-400">
                    <button
                      onClick={() => updateQuantity(cartKey, product.productId,
                        hasVariants ? `${product.name} (${selectedLabel})` : product.name,
                        displayPrice ?? 0, qty - 1, selectedLabel)}
                      className="flex-1 py-1.5 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center transition-colors font-bold text-base"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <div className="px-3 py-1.5 bg-primary-500 text-white text-sm font-bold min-w-[2rem] text-center">
                      {qty}
                    </div>
                    <button
                      onClick={() => updateQuantity(cartKey, product.productId,
                        hasVariants ? `${product.name} (${selectedLabel})` : product.name,
                        displayPrice ?? 0, qty + 1, selectedLabel)}
                      className="flex-1 py-1.5 bg-white hover:bg-gray-50 text-gray-700 flex items-center justify-center transition-colors font-bold text-base"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
            })()); // close nodes.push
          }); // close forEach
          return nodes;
        })()}
      </div>

      {/* Floating checkout bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-20 sm:bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl p-3 sm:p-4 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <span className="text-xs text-gray-500 block">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
                <span className="text-xl font-bold text-primary-600">{formatPrice(totalPrice)}</span>
              </div>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="flex-1 max-w-xs py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl p-6 w-full sm:max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up sm:animate-pop-in">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Confirm Your Order</h2>

            <div className="mb-4 p-4 bg-primary-50 rounded-xl border border-primary-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-primary-600 font-semibold">Collection Point</p>
                <p className="text-sm font-bold text-primary-900">{selectedCollectionPoint}</p>
              </div>
            </div>

            <div className="mb-5 bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-100">
              {cart.map(item => (
                <div key={item.cartKey} className="flex justify-between items-center px-4 py-3 text-sm">
                  <span className="text-gray-700 flex-1 pr-2">{item.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-gray-400 text-xs">×{item.quantity}</span>
                    <span className="font-bold text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center px-4 py-3">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-lg font-bold text-primary-600">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 py-3 border border-gray-200 text-gray-700 rounded-xl font-semibold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold text-sm transition-colors"
              >
                Place Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
