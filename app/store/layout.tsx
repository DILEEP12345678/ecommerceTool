'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useUserRole } from '@/components/UserContext';

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const role = useUserRole();

  // Redirect collection point managers to their dashboard
  useEffect(() => {
    if (role === 'collection_point_manager') {
      router.push('/collection-point');
    }
  }, [role, router]);

  // Don't render store pages for collection point managers
  if (role === 'collection_point_manager') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
