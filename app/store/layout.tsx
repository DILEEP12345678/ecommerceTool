'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useHasRole, useUserLoaded, useUserRole } from '@/components/UserContext';

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isCustomer = useHasRole('customer');
  const primaryRole = useUserRole();
  const loaded = useUserLoaded();

  useEffect(() => {
    if (!loaded) return;
    if (!primaryRole) { router.push('/login'); return; }
    if (!isCustomer) router.push(primaryRole === 'admin' ? '/admin' : '/collection-point');
  }, [isCustomer, primaryRole, loaded, router]);

  if (!loaded || !primaryRole || !isCustomer) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
