'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ClipboardList, LogIn, LogOut, Moon, Package, Shield, ShoppingCart, Sun, Tag, X } from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import { useUser, useUserRole } from './UserContext';
import { useTheme } from './ThemeProvider';
import { useState } from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();
  const { signOut } = useClerk();
  const role = useUserRole();
  const { theme, toggle } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
    router.push('/login');
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
    { href: '/admin/products',        label: 'Products',      icon: Tag         },
    { href: '/admin/ordered-items',   label: 'Ordered Items', icon: ShoppingCart },
  ];

  const links =
    role === 'admin' ? adminLinks :
    role === 'collection_point_manager' ? managerLinks :
    customerLinks;

  const homeLink =
    role === 'admin' ? '/admin' :
    role === 'collection_point_manager' ? '/collection-point' :
    '/store';

  const roleLabel =
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
      {/* ── MINIMAL TOP BAR ────────────────────────────────── */}
      <nav className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-50 border-b border-gray-100 dark:border-gray-700">
        <div className="px-4 sm:px-6">
          <div className="relative flex justify-between items-center h-14">
            {/* Logo */}
            <Link href={homeLink} className="flex items-center gap-2">
              <img src="/logo.png" alt="SquadBid" className="w-8 h-8 object-contain mix-blend-multiply dark:mix-blend-screen" />
              <span className="hidden sm:inline text-base font-bold text-gray-900 dark:text-gray-100">SquadBid</span>
            </Link>

            {/* Current page title — center */}
            {user && activeLabel && (
              <span className="absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-gray-700 dark:text-gray-200 pointer-events-none">
                {activeLabel}
              </span>
            )}

            {/* Menu trigger */}
            {user ? (
              <button
                onClick={() => setIsOpen(true)}
                className="flex items-center group"
                aria-label="Open menu"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 hidden sm:block">{user?.name}</span>
                  <div className="w-9 h-9 rounded-full bg-primary-500 text-white text-sm font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-800 group-hover:ring-primary-200 transition-all flex-shrink-0">
                    {initials}
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

      {/* ── DRAWER BACKDROP ────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 animate-fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* ── SLIDE-OUT DRAWER ───────────────────────────────── */}
      <div
        className={`fixed top-0 right-0 h-full w-72 bg-white dark:bg-gray-800 z-50 shadow-2xl flex flex-col will-change-transform ${
          isOpen
            ? 'translate-x-0 transition-transform duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]'
            : 'translate-x-full transition-transform duration-250 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabel}</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto">
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
                className={`flex items-center gap-3 px-3 py-3 rounded-xl mb-1 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Dark / Light toggle */}
        <div className="px-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between px-3 py-3">
            <div className="flex items-center gap-3">
              {theme === 'dark'
                ? <Moon className="w-5 h-5 text-gray-400" />
                : <Sun className="w-5 h-5 text-gray-400" />
              }
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </span>
            </div>
            {/* iOS-style toggle */}
            <div
              onClick={toggle}
              role="switch"
              aria-checked={theme === 'dark'}
              aria-label="Toggle dark mode"
              style={{
                display: 'inline-block',
                position: 'relative',
                width: '44px',
                height: '26px',
                borderRadius: '13px',
                backgroundColor: theme === 'dark' ? '#34C759' : '#E5E5EA',
                cursor: 'pointer',
                transition: 'background-color 0.25s ease',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: theme === 'dark' ? '21px' : '3px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  transition: 'left 0.25s ease',
                  display: 'block',
                }}
              />
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="px-3 pb-6 pt-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Log out
          </button>
        </div>
      </div>

      {/* ── MOBILE BOTTOM TAB BAR ──────────────────────────── */}
      {user && role !== 'admin' && !(role === 'collection_point_manager' && pathname === '/collection-point') && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 shadow-lg bottom-nav">
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
    </>
  );
}
