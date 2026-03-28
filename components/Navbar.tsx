'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ClipboardList, Loader2, LogIn, LogOut, MapPin, Moon, Package, Shield, ShoppingCart, Sun, Tag, Bell, Volume2, VolumeX } from 'lucide-react';
import { useClerk, useUser as useClerkUser } from '@clerk/nextjs';
import { useCollectionPoint, useHasRole, useUser, useUserRole } from './UserContext';
import { usePageTitle } from './PageTitleContext';
import { useTheme } from './ThemeProvider';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useNotifications } from './NotificationContext';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();
  const { signOut } = useClerk();
  const { user: clerkUser } = useClerkUser();
  const avatarUrl = clerkUser?.imageUrl;
  const role = useUserRole();
  const isAdmin = useHasRole('admin');
  const { theme, toggle } = useTheme();

  const isOnCollectionPoint = pathname.startsWith('/collection-point');
  const collectionPoint = useCollectionPoint();
  const [isOpen, setIsOpen] = useState(false);
  const pageTitle = usePageTitle();
  const [showCreditsHistory, setShowCreditsHistory] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('pack-sound-enabled') !== 'false';
  });
  const toggleSound = () => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('pack-sound-enabled', String(next));
      window.dispatchEvent(new Event('pack-sound-changed'));
      return next;
    });
  };
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const creditsData = useQuery(api.users.getCredits);
  const resetCreditsMutation = useMutation(api.users.resetCredits);
  const credits = creditsData?.credits ?? 0;
  const creditsHistory = creditsData?.history ?? [];
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsOpen(false);
    setLoggingOut(true);
    await signOut({ redirectUrl: '/login' });
  };

  const customerLinks = [
    { href: '/store', label: 'Shop', icon: Home },
    { href: '/store/orders', label: 'My Orders', icon: ClipboardList },
  ];

  const managerLinks = [
    { href: '/collection-point', label: 'Dashboard', icon: Package },
    { href: '/collection-point/pack-list', label: 'Pack List', icon: ShoppingCart },
  ];

  const adminLinks = [
    { href: '/admin',                 label: 'Dashboard',     icon: Shield      },
    { href: '/admin/all-orders',      label: 'All Orders',    icon: ClipboardList },
    { href: '/admin/products',        label: 'Products',      icon: Tag         },
    { href: '/admin/ordered-items',   label: 'Ordered Items', icon: ShoppingCart },
    { href: '/admin/users',           label: 'Users',         icon: Package     },
  ];

  const links =
    isAdmin && isOnCollectionPoint ? managerLinks :
    role === 'admin' ? adminLinks :
    role === 'collection_point_manager' ? managerLinks :
    customerLinks;

  const homeLink =
    isAdmin && isOnCollectionPoint ? '/collection-point' :
    role === 'admin' ? '/admin' :
    role === 'collection_point_manager' ? '/collection-point' :
    '/store';

  const roleLabel =
    isAdmin && isOnCollectionPoint ? 'Admin (CP View)' :
    role === 'admin' ? 'Admin' :
    role === 'collection_point_manager' ? 'Manager' :
    'Customer';

  const initials = user?.name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '';

  const activeLabel = links.find(link =>
    link.href === '/store'
      ? pathname === '/store'
      : pathname === link.href ||
        (pathname.startsWith(link.href + '/') &&
         !links.some(l => l.href !== link.href && pathname.startsWith(l.href)))
  )?.label ?? '';

  return (
    <>
      {/* ── LOGOUT OVERLAY ──────────────────────────────────── */}
      {loggingOut && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 flex items-center justify-center animate-fade-in">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-2xl flex items-center justify-center">
              <img src="/logo.png" alt="SquadBid" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-screen" />
            </div>
            <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
          </div>
        </div>
      )}

      {/* ── MINIMAL TOP BAR ────────────────────────────────── */}
      <nav className="bg-white/75 dark:bg-gray-900/75 backdrop-blur-xl sticky top-0 z-50 border-b border-white/60 dark:border-white/10 shadow-sm">
        <div className="px-4 sm:px-6">
          <div className="relative flex justify-between items-center h-14">
            {/* Logo */}
            <Link href={homeLink} className="flex items-center gap-2">
              <img src="/logo.png" alt="SquadBid" className="w-8 h-8 object-contain mix-blend-multiply dark:mix-blend-screen" />
              <span className="text-base font-bold text-gray-900 dark:text-gray-100">SquadBid</span>
            </Link>

            {/* Page title center */}
            {user && (() => {
              const orderMatch = pathname.match(/\/collection-point\/orders\/([^?/]+)/);
              const shortId = orderMatch ? orderMatch[1].split('-')[1] : null;
              const label = shortId
                ? (pageTitle ? `Order for ${pageTitle}` : null)
                : isOnCollectionPoint ? null : activeLabel;
              return label ? (
                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none max-w-[40%] sm:max-w-[50%]">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate block text-center">{label}</span>
                </div>
              ) : null;
            })()}


            {/* Menu trigger */}
            {user ? (
              <button
                onClick={() => setIsOpen(v => !v)}
                className="flex items-center group"
                aria-label="Open menu"
              >
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => { e.stopPropagation(); setShowNotifications(v => !v); if (unreadCount > 0) markAllRead(); }}
                    className="relative p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    aria-label="Notifications"
                  >
                    <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 hidden sm:block">{user?.name}</span>
                  {(role === 'collection_point_manager' || (isAdmin && isOnCollectionPoint)) && (
                    <span
                      onClick={e => { e.stopPropagation(); setShowCreditsHistory(true); }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-yellow-600 bg-yellow-50 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/50 transition-colors"
                    >
                      ⭐ {credits}
                    </span>
                  )}
                  <div className="w-9 h-9 rounded-full ring-2 ring-white dark:ring-gray-800 group-hover:ring-primary-200 transition-all flex-shrink-0 overflow-hidden bg-primary-500">
                    {avatarUrl
                      ? <img src={avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
                      : <span className="w-full h-full flex items-center justify-center text-white text-sm font-bold">{initials}</span>
                    }
                  </div>
                </div>
              </button>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-primary-600 bg-primary-50 rounded-xl"
              >
                <LogIn className="w-4 h-4" />
                Login
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* ── DROPDOWN BACKDROP ──────────────────────────────── */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}

      {/* ── DROPDOWN MENU ──────────────────────────────────── */}
      {isOpen && (
        <div className="fixed top-[58px] right-4 z-50 w-64 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 animate-fade-in-scale overflow-hidden">

          {/* User info */}
          <div className="px-4 py-3.5 border-b border-black/5 dark:border-white/10">
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{roleLabel}</p>
          </div>

          {/* Collection point — static display, first in list */}
          {collectionPoint !== null && collectionPoint !== undefined && (
            <div className="border-b border-black/5 dark:border-white/10 px-4 py-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide leading-none mb-0.5">Collection Point</p>
              <div className="flex items-center gap-1.5 mt-1">
                <MapPin className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{collectionPoint}</p>
              </div>
            </div>
          )}

          {/* Nav links */}
          <div className="p-1.5 space-y-0.5">
            {links.map((link) => {
              const isActive =
                link.href === '/store'
                  ? pathname === '/store'
                  : pathname === link.href ||
                    (pathname.startsWith(link.href + '/') &&
                     !links.some(l => l.href !== link.href && pathname.startsWith(l.href)));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-primary-500/10 text-primary-700 dark:bg-primary-400/15 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/8'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  {link.label}
                </Link>
              );
            })}
            {isAdmin && (
              <button
                onClick={() => { setIsOpen(false); router.push(isOnCollectionPoint ? '/admin' : '/collection-point'); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/8 transition-colors mt-0.5"
              >
                {isOnCollectionPoint
                  ? <><Shield className="w-4 h-4" /> Switch to Admin</>
                  : <><Package className="w-4 h-4" /> Switch to Collection Point</>
                }
              </button>
            )}
          </div>

          {/* Settings — sound + dark mode */}
          <div className="border-t border-black/5 dark:border-white/10 p-1.5 space-y-0.5">
            <button
              onClick={toggleSound}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/8 transition-colors"
            >
              <div className="flex items-center gap-3">
                {soundEnabled ? <Volume2 className="w-4 h-4 text-gray-400" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
                Sounds
              </div>
              <div style={{ position: 'relative', width: '36px', height: '22px', borderRadius: '11px', backgroundColor: soundEnabled ? '#34C759' : '#E5E5EA', transition: 'background-color 0.25s ease', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: '3px', left: soundEnabled ? '17px' : '3px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.25s ease', display: 'block' }} />
              </div>
            </button>
            <button
              onClick={toggle}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/8 transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-gray-400" /> : <Sun className="w-4 h-4 text-gray-400" />}
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </div>
              <div style={{ position: 'relative', width: '36px', height: '22px', borderRadius: '11px', backgroundColor: theme === 'dark' ? '#34C759' : '#E5E5EA', transition: 'background-color 0.25s ease', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: '3px', left: theme === 'dark' ? '17px' : '3px', width: '16px', height: '16px', borderRadius: '50%', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', transition: 'left 0.25s ease', display: 'block' }} />
              </div>
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-black/5 dark:border-white/10 p-1.5">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE BOTTOM TAB BAR ──────────────────────────── */}
      {user && role !== 'admin' && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-white/60 dark:border-white/10 shadow-lg bottom-nav">
          <div className="flex">
            {links.map((link) => {
              const isActive =
                link.href === '/store'
                  ? pathname === '/store'
                  : pathname === link.href ||
                    (pathname.startsWith(link.href + '/') &&
                     !links.some(l => l.href !== link.href && pathname.startsWith(l.href)));
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                    isActive ? 'text-primary-600' : 'text-gray-400 dark:text-gray-500 hover:text-primary-500'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-semibold">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* ── NOTIFICATIONS PANEL ────────────────────────────── */}
      {showNotifications && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setShowNotifications(false)} />
          <div className="fixed inset-x-4 top-20 z-[61] max-w-sm mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-fade-in-scale">
            <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Notifications</p>
              <div className="flex items-center gap-3">
                {notifications.length > 0 && (
                  <button onClick={clearAll} className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors">Clear all</button>
                )}
                <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">✕</button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-96">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <Bell className="w-8 h-8 text-gray-200 dark:text-gray-700" />
                  <p className="text-sm text-gray-400">No notifications yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {notifications.map(n => {
                    const date = new Date(n.timestamp);
                    const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    return (
                      <li key={n.id} className={`px-4 py-3 ${n.read ? '' : 'bg-blue-50/50 dark:bg-blue-900/10'}`}>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{n.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.body}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{timeStr}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── CREDITS HISTORY MODAL ──────────────────────────── */}
      {showCreditsHistory && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setShowCreditsHistory(false)} />
          <div className="fixed inset-x-4 top-20 z-[61] max-w-sm mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden animate-fade-in-scale">
            <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">Credits History</p>
                <p className="text-xs text-gray-400">Total: ⭐ {credits}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => resetCreditsMutation()}
                  className="text-xs font-semibold text-red-400 hover:text-red-600 transition-colors"
                >
                  Reset
                </button>
                <button onClick={() => setShowCreditsHistory(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">✕</button>
              </div>
            </div>
            <div className="overflow-y-auto max-h-80">
              {creditsHistory.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No credits earned yet</p>
              ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {creditsHistory.map((entry, i) => {
                    const date = new Date(entry.timestamp);
                    const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' + date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    return (
                      <li key={i} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-xl">⭐</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-gray-100">+{entry.amount} credits</p>
                          <p className="text-xs text-gray-500 truncate">Order #{entry.orderId.split('-')[1]} {entry.label ? `· ${entry.label}` : ''}</p>
                          <p className="text-[10px] text-gray-400">{timeStr}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
