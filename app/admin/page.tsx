'use client';

import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Loader2, Package, CheckCircle2, Clock, TrendingUp, MapPin, ShoppingBag, PoundSterling, BarChart2, Users, RefreshCw, Timer } from 'lucide-react';
import { useHasRole, useUserLoaded, useUsername } from '../../components/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Load chart components client-side only to avoid SSR issues
const OrdersBarChart  = dynamic(() => import('../../components/admin/OrdersBarChart'),  { ssr: false, loading: () => <div className="h-[180px] animate-pulse bg-gray-50 dark:bg-gray-700/40 rounded-xl" /> });
const DailyRevenueChart = dynamic(() => import('../../components/admin/DailyRevenueChart'), { ssr: false, loading: () => <div className="h-[180px] animate-pulse bg-gray-50 dark:bg-gray-700/40 rounded-xl" /> });
const TopProductsPie  = dynamic(() => import('../../components/admin/TopProductsPie'),  { ssr: false, loading: () => <div className="h-[220px] animate-pulse bg-gray-50 dark:bg-gray-700/40 rounded-xl" /> });

function useCountUp(value: number, duration = 700) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (from === value) { setDisplay(value); return; }
    const startTime = Date.now();
    const tick = () => {
      const p = Math.min((Date.now() - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value, duration]);
  return display;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}

export default function AdminDashboard() {
  const router = useRouter();
  const isAdmin = useHasRole('admin');
  const loaded = useUserLoaded();
  const username = useUsername();
  const metrics = useQuery(api.orders.getDashboardMetrics);

  useEffect(() => {
    if (!loaded) return;
    if (!isAdmin) router.push('/login');
  }, [isAdmin, router, loaded]);

  if (!metrics) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 pb-10 space-y-5">
        <div className="h-12 w-64 bg-white dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-pulse h-24 ${i === 0 ? 'col-span-2 lg:col-span-1' : ''}`} />
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-pulse h-24 ${i === 0 ? 'col-span-2 lg:col-span-1' : ''}`} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse h-64" />
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-5 pb-10 space-y-5">

      {/* ── PAGE HEADER ──────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {getGreeting()}{username ? `, ${username.split(' ')[0]}` : ''}
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate()}</p>
        </div>
      </div>

      {/* ── KPI CARDS ROW 1 — Order pipeline ─────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <RevenueCard revenuePence={metrics.totalRevenuePence} />
        <KpiCard label="Confirmed"     value={metrics.confirmed} icon={Clock}        color="bg-amber-500"                   textColor="text-white"                     subColor="text-amber-200"                   iconColor="text-amber-200" />
        <KpiCard label="Packed"        value={metrics.packed}    icon={Package}      color="bg-blue-500"                    textColor="text-white"                     subColor="text-blue-200"                    iconColor="text-blue-200" />
        <KpiCard label="Collected"     value={metrics.collected} icon={CheckCircle2} color="bg-green-500"                   textColor="text-white"                     subColor="text-green-200"                   iconColor="text-green-200" badge={`${metrics.fulfillmentRate}% rate`} />
      </div>

      {/* ── KPI CARDS ROW 2 — Business health ────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <AovCard avgOrderValuePence={metrics.avgOrderValuePence} />
        <KpiCard label="Active Customers" value={metrics.activeCustomers}  icon={Users}       color="bg-violet-500"  textColor="text-white" subColor="text-violet-200"  iconColor="text-violet-200" />
        <KpiCard label="Repeat Customers" value={metrics.repeatCustomers}  icon={RefreshCw}   color="bg-indigo-500"  textColor="text-white" subColor="text-indigo-200"  iconColor="text-indigo-200" badge={`${metrics.repeatRate}% rate`} />
        <TurnaroundCard avgTurnaround={metrics.avgTurnaround} />
      </div>

      {/* ── CHARTS ROW ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Orders — Last 14 Days</h2>
          </div>
          <OrdersBarChart data={metrics.dailyOrders} />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Revenue — Last 14 Days</h2>
          </div>
          <DailyRevenueChart data={metrics.dailyRevenue} />
        </div>
      </div>

      {/* ── COLLECTION POINTS + TOP PRODUCTS ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Collection Point Performance</h2>
          </div>
          {metrics.byCollectionPoint.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No data yet</p>
          ) : (
            <div className="space-y-3">
              {metrics.byCollectionPoint.map((cp: any) => {
                const pct = metrics.totalRevenuePence > 0
                  ? Math.round((cp.revenuePence / metrics.totalRevenuePence) * 100)
                  : 0;
                const revenue = (cp.revenuePence / 100).toFixed(2);
                return (
                  <div key={cp.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[55%]">{cp.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary-600 dark:text-primary-400 tabular-nums">£{revenue}</span>
                        <span className="text-xs text-gray-400 tabular-nums">{cp.count} orders</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div className="h-2 rounded-full bg-primary-500 transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag className="w-4 h-4 text-primary-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">Top Products</h2>
          </div>
          {metrics.topProducts.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No data yet</p>
          ) : (
            <TopProductsPie data={metrics.topProducts} />
          )}
        </div>

      </div>
    </div>
  );
}

function RevenueCard({ revenuePence }: { revenuePence: number }) {
  const displayedPence = useCountUp(revenuePence);
  const pounds = Math.floor(displayedPence / 100);
  const pence = displayedPence % 100;
  return (
    <div className="col-span-2 lg:col-span-1 rounded-2xl p-4 flex flex-col gap-2 bg-primary-600">
      <div className="flex items-center justify-between">
        <PoundSterling className="w-4 h-4 text-primary-200" />
      </div>
      <div>
        <p className="text-3xl font-bold tabular-nums leading-none text-white">
          £{pounds.toLocaleString()}<span className="text-lg font-semibold text-primary-200">.{String(pence).padStart(2, '0')}</span>
        </p>
        <p className="text-xs font-semibold mt-1 text-primary-200">Total Revenue</p>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, textColor, subColor, iconColor, badge }: {
  label: string; value: number; icon: any;
  color: string; textColor: string; subColor: string; iconColor: string;
  badge?: string;
}) {
  const displayed = useCountUp(value);
  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-2 ${color}`}>
      <div className="flex items-center justify-between">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        {badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 ${textColor}`}>{badge}</span>}
      </div>
      <div>
        <p className={`text-3xl font-bold tabular-nums leading-none ${textColor}`}>{displayed}</p>
        <p className={`text-xs font-semibold mt-1 ${subColor}`}>{label}</p>
      </div>
    </div>
  );
}

function AovCard({ avgOrderValuePence }: { avgOrderValuePence: number }) {
  const displayed = useCountUp(avgOrderValuePence);
  const pounds = Math.floor(displayed / 100);
  const pence = displayed % 100;
  return (
    <div className="col-span-2 lg:col-span-1 rounded-2xl p-4 flex flex-col gap-2 bg-teal-600">
      <PoundSterling className="w-4 h-4 text-teal-200" />
      <div>
        <p className="text-3xl font-bold tabular-nums leading-none text-white">
          £{pounds}<span className="text-lg font-semibold text-teal-200">.{String(pence).padStart(2, '0')}</span>
        </p>
        <p className="text-xs font-semibold mt-1 text-teal-200">Avg Order Value</p>
      </div>
    </div>
  );
}

function TurnaroundCard({ avgTurnaround }: { avgTurnaround: string | null }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-2 bg-orange-500">
      <Timer className="w-4 h-4 text-orange-200" />
      <div>
        <p className="text-3xl font-bold tabular-nums leading-none text-white">
          {avgTurnaround ?? '—'}
        </p>
        <p className="text-xs font-semibold mt-1 text-orange-200">Avg Turnaround</p>
      </div>
    </div>
  );
}
