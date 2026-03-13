'use client';

import { useUser as useClerkUser } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { createContext, useContext, useEffect, ReactNode } from 'react';
import { api } from '../convex/_generated/api';

type Role = 'customer' | 'collection_point_manager' | 'admin';

interface AppUser {
  _id: string;
  clerkId: string;
  email: string;
  name: string;
  roles: Role[];
  collectionPoint?: string;
}

interface UserContextType {
  user: AppUser | null;
  loaded: boolean;
}

const UserContext = createContext<UserContextType>({ user: null, loaded: false });

// Priority order: admin > collection_point_manager > customer
function getPrimaryRole(roles: Role[]): Role {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('collection_point_manager')) return 'collection_point_manager';
  return 'customer';
}

export function useUser() { return useContext(UserContext).user; }
export function useUserLoaded() { return useContext(UserContext).loaded; }
export function useUserId() { return useContext(UserContext).user?._id ?? null; }
export function useUsername() { return useContext(UserContext).user?.name ?? null; }
export function useCollectionPoint() { return useContext(UserContext).user?.collectionPoint ?? null; }

/** All roles assigned to the user */
export function useUserRoles(): Role[] {
  const user = useContext(UserContext).user;
  if (!user) return [];
  if (user.roles?.length) return user.roles;
  // Legacy fallback for unmigrated users with singular `role` field
  const legacyRole = (user as any).role as Role | undefined;
  return legacyRole ? [legacyRole] : [];
}

/** Primary role (highest privilege): admin > collection_point_manager > customer */
export function useUserRole(): Role | null {
  const roles = useUserRoles();
  if (roles.length === 0) return null;
  return getPrimaryRole(roles);
}

/** Check if user has a specific role */
export function useHasRole(role: Role): boolean {
  return useUserRoles().includes(role);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const { user: clerkUser, isLoaded: clerkLoaded } = useClerkUser();

  const convexUser = useQuery(
    api.users.getByClerkId,
    clerkLoaded && clerkUser ? { clerkId: clerkUser.id } : 'skip'
  );

  const upsert = useMutation(api.users.upsertFromClerk);

  // Auto-create Convex user record on first Clerk sign-in, or migrate existing users missing `roles`
  useEffect(() => {
    if (!clerkLoaded || !clerkUser) return;
    if (convexUser === undefined) return; // still loading
    // Skip if user exists and already has roles populated
    if (convexUser !== null && (convexUser as any).roles?.length > 0) return;

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
