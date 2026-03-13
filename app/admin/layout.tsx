'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useHasRole, useUserLoaded, useUserRole } from '@/components/UserContext';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAdmin = useHasRole('admin');
  const primaryRole = useUserRole();
  const loaded = useUserLoaded();

  useEffect(() => {
    if (!loaded) return;
    if (!primaryRole) { router.push('/login'); return; }
    if (!isAdmin) router.push(primaryRole === 'collection_point_manager' ? '/collection-point' : '/store');
  }, [isAdmin, primaryRole, loaded, router]);

  if (!loaded || !primaryRole || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
