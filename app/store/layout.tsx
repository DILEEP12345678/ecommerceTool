'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useHasRole, useUserRole } from '@/components/UserContext';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isCustomer = useHasRole('customer');
  const primaryRole = useUserRole();

  useEffect(() => {
    if (primaryRole && !isCustomer) {
      router.push(primaryRole === 'admin' ? '/admin' : '/collection-point');
    }
  }, [isCustomer, primaryRole, router]);

  if (primaryRole && !isCustomer) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
