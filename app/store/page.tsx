'use client';

import { useState, useEffect } from 'react';
import * as React from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Plus, Minus, Loader2, Package, MapPin } from 'lucide-react';
import { useUserId, useUsername, useCollectionPoint } from '../../components/UserContext';

interface CartItem {
  id: string;
  name: string;
  quantity: number;
}

export default function HomePage() {
  const userId = useUserId();
  const username = useUsername();
  const userCollectionPoint = useCollectionPoint();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedCollectionPoint, setSelectedCollectionPoint] = useState(userCollectionPoint || '');

  const products = useQuery(api.products.list);
  const collectionPoints = useQuery(api.users.getCollectionPoints);
  const createOrder = useMutation(api.orders.create);

  // Update selected collection point when user collection point changes
  React.useEffect(() => {
    if (userCollectionPoint && !selectedCollectionPoint) {
      setSelectedCollectionPoint(userCollectionPoint);
    }
  }, [userCollectionPoint, selectedCollectionPoint]);

  const getItemQuantity = (productId: string) => {
    const item = cart.find((item) => item.id === productId);
    return item ? item.quantity : 0;
  };

  const updateQuantity = (product: any, newQuantity: number) => {
    if (newQuantity <= 0) {
      // Remove from cart
      setCart((prev) => prev.filter((item) => item.id !== product.id));
    } else {
      setCart((prev) => {
        const existing = prev.find((item) => item.id === product.id);
        if (existing) {
          return prev.map((item) =>
            item.id === product.id ? { ...item, quantity: newQuantity } : item
          );
        }
        return [...prev, { id: product.id, name: product.name, quantity: newQuantity }];
      });
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Please add items to your order');
      return;
    }

    if (!username) {
      alert('Please login to place an order');
      return;
    }

    if (!selectedCollectionPoint) {
      alert('Please select a collection point');
      return;
    }

    try {
      await createOrder({
        items: cart.map((item) => ({
          itemId: item.id,
          itemName: item.name,
          quantity: item.quantity,
        })),
        username,
        collectionPoint: selectedCollectionPoint,
      });

      alert('Order placed successfully!');
      setCart([]);
      setShowCheckout(false);
    } catch (error) {
      alert('Failed to place order. Please try again.');
    }
  };

  if (!products) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-gray-500 text-sm">Hello {username || 'Guest'} 👋</p>
            <h1 className="text-2xl font-bold text-gray-900">
              What would you like to order?
            </h1>
          </div>
        </div>

        {/* Collection Point Selector */}
        <div className="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-sm">
          <label className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700 block mb-1">
                Collection Point:
              </span>
              {!collectionPoints ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                  <span className="text-sm text-gray-500">Loading...</span>
                </div>
              ) : (
                <select
                  value={selectedCollectionPoint}
                  onChange={(e) => setSelectedCollectionPoint(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a collection point...</option>
                  {collectionPoints.map((point) => (
                    <option key={point} value={point}>
                      {point}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </label>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product) => {
          const quantity = getItemQuantity(product.id);
          return (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
            >
              <div className="flex items-center justify-center mb-4">
                <Package className="w-12 h-12 text-blue-500" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2 text-center">
                {product.name}
              </h3>
              <p className="text-xs text-gray-500 mb-4 text-center">
                {product.category}
              </p>

              {quantity === 0 ? (
                <button
                  onClick={() => updateQuantity(product, 1)}
                  className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center justify-center gap-2 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add to Order
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(product, quantity - 1)}
                    className="flex-1 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <div className="flex-1 py-2 bg-blue-50 text-blue-700 rounded-lg text-center font-bold">
                    {quantity}
                  </div>
                  <button
                    onClick={() => updateQuantity(product, quantity + 1)}
                    className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Checkout Button */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 z-40">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Total Items</span>
              <span className="text-2xl font-bold text-blue-600">{totalItems}</span>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="flex-1 max-w-md py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold text-lg"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Confirm Order</h2>

            {/* Collection Point Info */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 mb-1">Collection Point:</p>
              <p className="font-semibold text-blue-900">{selectedCollectionPoint}</p>
            </div>

            {/* Order Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{item.name}</span>
                    <span className="font-semibold text-gray-900">
                      Qty: {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between font-bold">
                  <span>Total Items:</span>
                  <span className="text-blue-600">{totalItems}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCheckout(false)}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckout}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
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
