'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useHasRole, useUserLoaded, useUserRole } from '@/components/UserContext';

export default function CollectionPointLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isManager = useHasRole('collection_point_manager');
  const isAdmin = useHasRole('admin');
  const primaryRole = useUserRole();
  const loaded = useUserLoaded();

  useEffect(() => {
    if (!loaded) return;
    if (!primaryRole) { router.push('/login'); return; }
    if (!isManager && !isAdmin) router.push('/store');
  }, [isManager, isAdmin, primaryRole, loaded, router]);

  if (!loaded || !primaryRole || (!isManager && !isAdmin)) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
