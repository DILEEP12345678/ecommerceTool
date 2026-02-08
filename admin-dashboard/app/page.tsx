'use client';

import { useQuery } from 'convex/react';
import { api } from '../convex/_generated/api';
import Link from 'next/link';
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

export default function DashboardPage() {
  const stats = useQuery(api.orders.getStats);
  const recentOrders = useQuery(api.orders.listAll, { status: undefined });
  const products = useQuery(api.products.list, {});

  const lowStockProducts = products?.filter((p) => p.stock < 10) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">
              FreshCart Admin
            </h1>
            <nav className="flex gap-4">
              <Link
                href="/"
                className="px-4 py-2 text-primary-600 font-medium"
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
                className="px-4 py-2 text-gray-600 hover:text-primary-600"
              >
                Orders
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Revenue"
            value={`₹${(stats?.totalRevenue || 0).toFixed(2)}`}
            icon={<DollarSign className="w-6 h-6 text-primary-600" />}
            trend="+12.5%"
          />
          <StatCard
            title="Total Orders"
            value={stats?.totalOrders || 0}
            icon={<ShoppingCart className="w-6 h-6 text-blue-600" />}
            trend="+8.2%"
          />
          <StatCard
            title="Products"
            value={products?.length || 0}
            icon={<Package className="w-6 h-6 text-purple-600" />}
          />
          <StatCard
            title="Avg Order Value"
            value={`₹${(stats?.averageOrderValue || 0).toFixed(2)}`}
            icon={<TrendingUp className="w-6 h-6 text-green-600" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Recent Orders
              </h2>
              <Link
                href="/orders"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                View All
              </Link>
            </div>
            <div className="space-y-4">
              {recentOrders?.slice(0, 5).map((order) => (
                <div
                  key={order._id}
                  className="flex justify-between items-center p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      Order #{order._id.slice(-6)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.user?.name || 'Guest'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ₹{order.total.toFixed(2)}
                    </p>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Alert */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h2 className="text-xl font-bold text-gray-900">
                Low Stock Alert
              </h2>
            </div>
            <div className="space-y-4">
              {lowStockProducts.length === 0 ? (
                <p className="text-gray-500">All products are well stocked!</p>
              ) : (
                lowStockProducts.map((product) => (
                  <div
                    key={product._id}
                    className="flex justify-between items-center p-4 border border-red-200 bg-red-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.stock} {product.unit} remaining
                      </p>
                    </div>
                    <Link
                      href={`/products/${product._id}`}
                      className="px-3 py-1 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700"
                    >
                      Restock
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Order Status Breakdown */}
        {stats?.statusCounts && (
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Order Status Breakdown
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Object.entries(stats.statusCounts).map(([status, count]) => (
                <div
                  key={status}
                  className="p-4 border border-gray-200 rounded-lg text-center"
                >
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                  <p className="text-sm text-gray-600 capitalize">
                    {status.replace('_', ' ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
        {trend && (
          <span className="text-sm font-medium text-green-600">{trend}</span>
        )}
      </div>
      <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    preparing: 'bg-purple-100 text-purple-800',
    out_for_delivery: 'bg-indigo-100 text-indigo-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}
