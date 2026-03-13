'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ClipboardList, Loader2, LogIn, LogOut, Moon, Package, Shield, ShoppingCart, Sun, Tag } from 'lucide-react';
import { useClerk, useUser as useClerkUser } from '@clerk/nextjs';
import { useHasRole, useUser, useUserRole } from './UserContext';
import { useTheme } from './ThemeProvider';
import { useState } from 'react';

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
  const isOnAdmin = pathname.startsWith('/admin');
  const [isOpen, setIsOpen] = useState(false);
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
      <nav className="bg-[#f4f6f0] dark:bg-[#1a1c19] sticky top-0 z-50 border-b border-[#c4c8c0] dark:border-[#3a3d35]" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
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
        <div className="fixed top-[58px] right-4 z-50 w-64 bg-white dark:bg-[#2a2d28] rounded-[16px] border border-[#c4c8c0] dark:border-[#3a3d35] animate-fade-in-scale overflow-hidden" style={{ boxShadow: '0 2px 6px 2px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.12)' }}>

          {/* User info */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#c4c8c0] dark:border-[#3a3d35]">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-primary-500 flex-shrink-0">
              {avatarUrl
                ? <img src={avatarUrl} alt={user?.name} className="w-full h-full object-cover" />
                : <span className="w-full h-full flex items-center justify-center text-white font-bold text-sm">{initials}</span>
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{roleLabel}</p>
            </div>
          </div>

          {/* Nav links */}
          <div className="p-1.5">
            {isAdmin && (
              <button
                onClick={() => { setIsOpen(false); router.push(isOnCollectionPoint ? '/admin' : '/collection-point'); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/8 transition-colors mb-1"
              >
                {isOnCollectionPoint
                  ? <><Shield className="w-4 h-4" /> Switch to Admin</>
                  : <><Package className="w-4 h-4" /> Switch to Collection Point</>
                }
              </button>
            )}
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
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-full text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[#b7f5c8] dark:bg-[#004d26] text-[#1a6b2f] dark:text-[#7dd98a]'
                      : 'text-[#1a1c19] dark:text-[#e2e3de] hover:bg-[#d8dcd4] dark:hover:bg-[#2e3129]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#1a6b2f] dark:text-[#7dd98a]' : 'text-[#42493e] dark:text-[#8a9384]'}`} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Dark mode + Logout */}
          <div className="border-t border-[#c4c8c0] dark:border-[#3a3d35] p-1.5">
            <button
              onClick={toggle}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/8 transition-colors"
            >
              <div className="flex items-center gap-3">
                {theme === 'dark' ? <Moon className="w-4 h-4 text-gray-400" /> : <Sun className="w-4 h-4 text-gray-400" />}
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </div>
              <div
                style={{
                  position: 'relative', width: '36px', height: '22px', borderRadius: '11px',
                  backgroundColor: theme === 'dark' ? '#34C759' : '#E5E5EA',
                  transition: 'background-color 0.25s ease', flexShrink: 0,
                }}
              >
                <span style={{
                  position: 'absolute', top: '3px',
                  left: theme === 'dark' ? '17px' : '3px',
                  width: '16px', height: '16px', borderRadius: '50%',
                  backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  transition: 'left 0.25s ease', display: 'block',
                }} />
              </div>
            </button>
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
      {user && role !== 'admin' && !(role === 'collection_point_manager' && pathname === '/collection-point') && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#e8ece4] dark:bg-[#212420] border-t border-[#c4c8c0] dark:border-[#3a3d35] bottom-nav" style={{ boxShadow: '0 -1px 3px rgba(0,0,0,0.08)' }}>
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
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 transition-colors"
                >
                  <span className={`flex items-center justify-center w-16 h-8 rounded-full transition-all ${
                    isActive ? 'bg-[#b7f5c8] dark:bg-[#004d26]' : ''
                  }`}>
                    <Icon className={`w-5 h-5 ${isActive ? 'text-[#1a6b2f] dark:text-[#7dd98a]' : 'text-[#42493e] dark:text-[#8a9384]'}`} />
                  </span>
                  <span className={`text-xs font-medium ${isActive ? 'text-[#1a6b2f] dark:text-[#7dd98a] font-semibold' : 'text-[#42493e] dark:text-[#8a9384]'}`}>
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </>
  );
}
