'use client';

import { useUser as useClerkUser } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { createContext, useContext, useEffect, ReactNode } from 'react';
import { api } from '../convex/_generated/api';

interface AppUser {
  _id: string;
  clerkId: string;
  email: string;
  name: string;
  role: 'customer' | 'collection_point_manager' | 'admin';
  collectionPoint?: string;
}

interface UserContextType {
  user: AppUser | null;
  loaded: boolean;
}

const UserContext = createContext<UserContextType>({ user: null, loaded: false });

export function useUser() { return useContext(UserContext).user; }
export function useUserLoaded() { return useContext(UserContext).loaded; }
export function useUserId() { return useContext(UserContext).user?._id ?? null; }
export function useUsername() { return useContext(UserContext).user?.name ?? null; }
export function useUserRole() { return useContext(UserContext).user?.role ?? null; }
export function useCollectionPoint() { return useContext(UserContext).user?.collectionPoint ?? null; }

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useClerkUser();

  const convexUser = useQuery(
    api.users.getByClerkId,
    clerkLoaded && clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );

  const upsert = useMutation(api.users.upsertFromClerk);

  // Auto-create Convex user record on first Clerk sign-in
  useEffect(() => {
    if (!clerkLoaded || !clerkUser) return;
    if (convexUser === undefined) return; // still loading
    if (convexUser !== null) return;      // already exists

    upsert({
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? '',
      name: clerkUser.fullName ?? clerkUser.firstName ?? clerkUser.emailAddresses[0]?.emailAddress ?? '',
    }).catch(console.error);
  }, [clerkLoaded, clerkUser, convexUser, upsert]);

  // loaded = Clerk resolved AND (not signed in, or Convex query resolved)
  const loaded = clerkLoaded && (!clerkUser || convexUser !== undefined);
  const user = (clerkUser ? (convexUser ?? null) : null) as AppUser | null;

  return (
    <UserContext.Provider value={{ user, loaded }}>
      {children}
    </UserContext.Provider>
  );
}
