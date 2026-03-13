'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useHasRole, useUserRole } from '@/components/UserContext';

export default function CollectionPointLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isManager = useHasRole('collection_point_manager');
  const primaryRole = useUserRole();

  useEffect(() => {
    if (primaryRole && !isManager) {
      router.push(primaryRole === 'admin' ? '/admin' : '/store');
    }
  }, [isManager, primaryRole, router]);

  if (primaryRole && !isManager) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
