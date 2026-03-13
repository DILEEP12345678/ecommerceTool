'use client';

import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useState } from 'react';
import { Loader2, User, Shield, Package, ShoppingBag, Check, ChevronDown, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const ALL_ROLES = ['customer', 'collection_point_manager', 'admin'] as const;
type Role = typeof ALL_ROLES[number];

const ROLE_LABELS: Record<Role, string> = {
  customer: 'Customer',
  collection_point_manager: 'Collection Point',
  admin: 'Admin',
};

const ROLE_ICONS: Record<Role, React.ElementType> = {
  customer: ShoppingBag,
  collection_point_manager: Package,
  admin: Shield,
};

export default function AdminUsersPage() {
  const users = useQuery(api.users.listAll);
  const collectionPoints = useQuery(api.users.getCollectionPoints) ?? [];
  const updateRoles = useMutation(api.users.updateRoles);
  const [editing, setEditing] = useState<string | null>(null);
  const [pendingRoles, setPendingRoles] = useState<Role[]>([]);
  const [pendingCP, setPendingCP] = useState('');
  const [saving, setSaving] = useState(false);

  const startEdit = (userId: string, currentRoles: Role[], currentCP: string) => {
    setEditing(userId);
    setPendingRoles([...currentRoles]);
    setPendingCP(currentCP);
  };

  const toggleRole = (role: Role) => {
    setPendingRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  const saveRoles = async (userId: string) => {
    if (saving) return;
    setSaving(true);
    try {
      await updateRoles({
        userId: userId as any,
        roles: pendingRoles,
        collectionPoint: pendingCP.trim() || undefined,
      });
      toast.success('User updated');
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 sm:pb-6">
      <div className="sticky top-14 z-10 bg-white border-b border-gray-100 shadow-sm px-4 py-2.5 flex items-center justify-between">
        <h1 className="text-sm font-bold text-gray-900">Users</h1>
        {users !== undefined && (
          <span className="text-xs bg-primary-100 text-primary-700 font-bold px-2 py-0.5 rounded-full">
            {users.length} users
          </span>
        )}
      </div>

      <div className="px-4 pt-4 max-w-3xl mx-auto">
        {users === undefined ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-7 h-7 text-primary-400 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user: any) => {
              const roles: Role[] = user.roles ?? ((user as any).role ? [(user as any).role] : []);
              const isEditingThis = editing === user._id;

              return (
                <div key={user._id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="px-4 py-3.5 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      {user.collectionPoint && (
                        <p className="text-xs text-primary-600 font-medium truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{user.collectionPoint}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => isEditingThis ? setEditing(null) : startEdit(user._id, roles, user.collectionPoint ?? '')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0"
                    >
                      {isEditingThis ? 'Cancel' : 'Edit'}
                      {!isEditingThis && <ChevronDown className="w-3 h-3 opacity-60" />}
                    </button>
                  </div>

                  {/* Role badges */}
                  <div className="px-4 pb-3.5 flex flex-wrap gap-1.5">
                    {roles.length === 0 ? (
                      <span className="text-xs text-red-500 font-semibold bg-red-50 px-2 py-0.5 rounded-full">No roles assigned</span>
                    ) : roles.map(role => {
                      const Icon = ROLE_ICONS[role];
                      return (
                        <span key={role} className="inline-flex items-center gap-1 text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                          <Icon className="w-3 h-3" />
                          {ROLE_LABELS[role]}
                        </span>
                      );
                    })}
                  </div>

                  {/* Inline editor */}
                  {isEditingThis && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                      {/* Roles */}
                      <div>
                        <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Roles</p>
                        <div className="flex flex-wrap gap-2">
                          {ALL_ROLES.map(role => {
                            const Icon = ROLE_ICONS[role];
                            const active = pendingRoles.includes(role);
                            return (
                              <button
                                key={role}
                                onClick={() => toggleRole(role)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                                  active
                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {ROLE_LABELS[role]}
                                {active && <Check className="w-3 h-3" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Collection point — shown when CP manager role is selected */}
                      {pendingRoles.includes('collection_point_manager') && (
                        <div>
                          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Collection Point</p>
                          {collectionPoints.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {collectionPoints.map(cp => (
                                <button
                                  key={cp}
                                  type="button"
                                  onClick={() => setPendingCP(cp)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border-2 transition-all ${
                                    pendingCP === cp
                                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                                  }`}
                                >
                                  <MapPin className="w-3 h-3" />
                                  {cp}
                                </button>
                              ))}
                            </div>
                          )}
                          <input
                            type="text"
                            value={pendingCP}
                            onChange={e => setPendingCP(e.target.value)}
                            placeholder="Or type a new collection point name…"
                            className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm font-medium text-gray-800 placeholder-gray-400 focus:border-primary-400 focus:outline-none bg-white"
                          />
                        </div>
                      )}

                      <button
                        onClick={() => saveRoles(user._id)}
                        disabled={saving || pendingRoles.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        Save
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
