'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, ClipboardList, LogIn, LogOut, Package } from 'lucide-react';
import { useUser, useSetUser, useUserRole } from './UserContext';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();
  const setUser = useSetUser();
  const role = useUserRole();

  const handleLogout = () => {
    setUser(null);
    router.push('/login');
  };

  const customerLinks = [
    { href: '/store', label: 'Shop', icon: Home },
    { href: '/store/orders', label: 'My Orders', icon: ClipboardList },
  ];

  const managerLinks = [
    { href: '/collection-point', label: 'Dashboard', icon: Package },
  ];

  const links = role === 'collection_point_manager' ? managerLinks : customerLinks;
  const homeLink = role === 'collection_point_manager' ? '/collection-point' : '/store';

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href={homeLink} className="flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-500" />
            <span className="text-xl font-bold text-gray-900">Collection Point System</span>
          </Link>

          {/* Nav Links */}
          <div className="flex items-center gap-1">
            {user && links.map((link) => {
              const isActive =
                link.href === '/store'
                  ? pathname === '/store'
                  : pathname.startsWith(link.href);
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}

            {/* User Info & Login/Logout */}
            {user ? (
              <div className="ml-4 flex items-center gap-3 border-l border-gray-200 pl-4">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">
                    {role === 'collection_point_manager' ? 'Manager' : 'Customer'}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="ml-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border-l border-gray-200"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
