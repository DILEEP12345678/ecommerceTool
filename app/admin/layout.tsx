'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useHasRole, useUserRole } from '@/components/UserContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAdmin = useHasRole('admin');
  const primaryRole = useUserRole();

  useEffect(() => {
    if (primaryRole && !isAdmin) {
      router.push(primaryRole === 'collection_point_manager' ? '/collection-point' : '/store');
    }
  }, [isAdmin, primaryRole, router]);

  if (primaryRole && !isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
