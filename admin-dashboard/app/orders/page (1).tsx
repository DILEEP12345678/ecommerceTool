'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Package, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import Link from 'next/link';

export default function OrdersPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const orders = useQuery(api.orders.listAll, {
    status: selectedStatus || undefined,
  });
  const updateOrderStatus = useMutation(api.orders.updateStatus);

  const handleStatusUpdate = async (orderId: string, newStatus: any) => {
    await updateOrderStatus({
      id: orderId as any,
      status: newStatus,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'preparing':
        return <Package className="w-5 h-5 text-purple-600" />;
      case 'out_for_delivery':
        return <Truck className="w-5 h-5 text-indigo-600" />;
      case 'delivered':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      out_for_delivery: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <nav className="flex gap-4">
              <Link
                href="/"
                className="px-4 py-2 text-gray-600 hover:text-primary-600"
              >
                Dashboard
              </Link>
              <Link
                href="/products"
                className="px-4 py-2 text-gray-600 hover:text-primary-600"
              >
                Products
              </Link>
              <Link
                href="/categories"
                className="px-4 py-2 text-gray-600 hover:text-primary-600"
              >
                Categories
              </Link>
              <Link
                href="/orders"
                className="px-4 py-2 text-primary-600 font-medium"
              >
                Orders
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Filter */}
        <div className="mb-6">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">All Orders</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders?.map((order) => (
            <div key={order._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(order.status)}
                    <h3 className="text-lg font-bold text-gray-900">
                      Order #{order._id.slice(-8)}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    Customer: {order.user?.name || 'Guest'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Email: {order.user?.email || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Date:{' '}
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900">
                    ₹{order.total.toFixed(2)}
                  </p>
                  <span
                    className={`inline-block mt-2 px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(
                      order.status
                    )}`}
                  >
                    {order.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Delivery Address */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">
                  Delivery Address
                </h4>
                <p className="text-sm text-gray-600">
                  {order.deliveryAddress.street}
                </p>
                <p className="text-sm text-gray-600">
                  {order.deliveryAddress.city}, {order.deliveryAddress.state}{' '}
                  {order.deliveryAddress.zipCode}
                </p>
              </div>

              {/* Order Items */}
              <div className="mb-4">
                <h4 className="font-semibold text-gray-900 mb-2">Items</h4>
                <div className="space-y-2">
                  {order.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-gray-700">
                        {item.name} x {item.quantity}
                      </span>
                      <span className="font-medium text-gray-900">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">
                    ₹{order.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900">₹{order.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="text-gray-900">
                    ₹{order.deliveryFee.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Status Update */}
              {order.status !== 'delivered' && order.status !== 'cancelled' && (
                <div className="mt-4 flex gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={() =>
                        handleStatusUpdate(order._id, 'confirmed')
                      }
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Confirm Order
                    </button>
                  )}
                  {order.status === 'confirmed' && (
                    <button
                      onClick={() =>
                        handleStatusUpdate(order._id, 'preparing')
                      }
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                    >
                      Start Preparing
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      onClick={() =>
                        handleStatusUpdate(order._id, 'out_for_delivery')
                      }
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                    >
                      Out for Delivery
                    </button>
                  )}
                  {order.status === 'out_for_delivery' && (
                    <button
                      onClick={() =>
                        handleStatusUpdate(order._id, 'delivered')
                      }
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      Mark Delivered
                    </button>
                  )}
                  <button
                    onClick={() => handleStatusUpdate(order._id, 'cancelled')}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    Cancel Order
                  </button>
                </div>
              )}
            </div>
          ))}

          {orders?.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">No orders found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
