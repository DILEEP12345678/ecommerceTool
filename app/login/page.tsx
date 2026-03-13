'use client';

import { SignIn, useClerk, useUser as useClerkUser } from '@clerk/nextjs';
import { useMutation, useQuery } from 'convex/react';
import { CheckCircle2, Loader2, MapPin, Package, Shield, ShoppingBag, Truck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '../../convex/_generated/api';
import { useUser, useUserLoaded, useUserRoles } from '../../components/UserContext';

export default function LoginPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded: clerkLoaded } = useClerkUser();
  const { signOut } = useClerk();
  const appUser = useUser();
  const appLoaded = useUserLoaded();
  const userRoles = useUserRoles();
  const [selectedCP, setSelectedCP] = useState('');
  const [saving, setSaving] = useState(false);
  const [showRoleChooser, setShowRoleChooser] = useState(false);

  const collectionPointsResult = useQuery(api.users.getCollectionPoints);
  const collectionPoints = collectionPointsResult ?? [];
  const updateCP = useMutation(api.users.updateCollectionPoint);

  useEffect(() => {
    if (!appLoaded || !appUser) return;
    if (userRoles.includes('admin')) {
      setShowRoleChooser(true);
      return;
    }
    if (userRoles.includes('collection_point_manager')) router.replace('/collection-point');
    else if (userRoles.includes('customer') && appUser.collectionPoint) router.replace('/store');
  }, [appUser, appLoaded, userRoles, router]);

  if (!clerkLoaded || !appLoaded) return <Spinner />;

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-white flex">
        {/* Left panel — branding */}
        <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col justify-between p-12" style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)' }}>
          {/* Background blobs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 -right-32 w-80 h-80 bg-emerald-300/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-primary-800/20 rounded-full blur-3xl" />
          </div>

          {/* Logo */}
          <div className="relative flex items-center gap-3">
            <img src="/logo.png" alt="SquadBid" className="w-10 h-10 object-contain mix-blend-screen" />
            <span className="text-white font-bold text-xl tracking-tight">SquadBid</span>
          </div>

          {/* Hero text */}
          <div className="relative">
            <h1 className="text-5xl font-bold text-white leading-tight mb-6">
              Shop together,<br />
              <span className="text-emerald-200">save together.</span>
            </h1>
            <p className="text-white/70 text-lg leading-relaxed mb-12 max-w-sm">
              Join your squad, pool your orders, and collect fresh groceries from your nearest point — no delivery windows, no missed slots.
            </p>

            {/* Feature pills */}
            <div className="space-y-3">
              {[
                { icon: ShoppingBag, text: 'Order from a curated local catalogue' },
                { icon: MapPin,      text: 'Pick up from your nearest point'      },
                { icon: Truck,       text: 'Packed fresh and ready when you are'  },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white/85 text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom quote */}
          <div className="relative border-t border-white/20 pt-6">
            <p className="text-white/60 text-sm italic">
              "Simple ordering, reliable collection."
            </p>
          </div>
        </div>

        {/* Right panel — sign in */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 bg-gray-50 lg:bg-white">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <img src="/logo.png" alt="SquadBid" className="w-10 h-10 object-contain mix-blend-multiply" />
            <span className="text-gray-900 font-bold text-xl">SquadBid</span>
          </div>

          <div className="w-full max-w-sm" id="clerk-container">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome to SquadBid</h2>
              <p className="text-gray-500 text-sm">Sign in to your account to continue</p>
            </div>

            <SignIn
              routing="hash"
              fallbackRedirectUrl="/login"
              signUpFallbackRedirectUrl="/login"
              appearance={{
                elements: {
                  headerTitle: 'hidden',
                  headerSubtitle: 'hidden',
                  header: 'hidden',
                  formButtonPrimary:
                    'bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-semibold text-sm transition-all shadow-sm',
                  footerActionLink: 'text-primary-600 hover:text-primary-700 font-semibold',
                },
              }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!appUser) return <Spinner />;

  // Role chooser for admins
  if (showRoleChooser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-fade-in-up">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-primary-400 via-primary-500 to-emerald-400" />
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <img src="/logo.png" alt="SquadBid" className="w-8 h-8 object-contain mix-blend-multiply" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Welcome back</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Where would you like to go?</p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => router.replace('/admin')}
                  className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 hover:border-primary-300 hover:bg-primary-50 transition-all duration-150 text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 group-hover:bg-primary-500 group-hover:border-primary-500 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Shield className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Admin Dashboard</p>
                    <p className="text-xs text-gray-500 mt-0.5">Manage products, orders & users</p>
                  </div>
                </button>

                <button
                    onClick={() => router.replace('/collection-point')}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 hover:border-primary-300 hover:bg-primary-50 transition-all duration-150 text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 group-hover:bg-primary-500 group-hover:border-primary-500 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Package className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">Collection Point</p>
                      <p className="text-xs text-gray-500 mt-0.5">Manage orders & packing</p>
                    </div>
                  </button>

                {userRoles.includes('customer') && appUser.collectionPoint && (
                  <button
                    onClick={() => router.replace('/store')}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 hover:border-primary-300 hover:bg-primary-50 transition-all duration-150 text-left group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 group-hover:bg-primary-500 group-hover:border-primary-500 flex items-center justify-center flex-shrink-0 transition-colors">
                      <ShoppingBag className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">Store</p>
                      <p className="text-xs text-gray-500 mt-0.5">Browse & order products</p>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Collection point selection step
  const roles = appUser.roles;
  if (roles.includes('customer') && !appUser.collectionPoint) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-fade-in-up">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1.5 bg-gradient-to-r from-primary-400 via-primary-500 to-emerald-400" />

            <div className="p-8">
              {/* Icon + heading */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary-500" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Choose a Collection Point</h1>
                  <p className="text-sm text-gray-500 mt-0.5">Where would you like to collect your orders?</p>
                </div>
              </div>

              {/* Collection point list */}
              {collectionPointsResult === undefined ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-7 h-7 text-primary-400 animate-spin" />
                </div>
              ) : collectionPoints.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-4">
                  <p className="text-sm text-gray-500 text-center">No collection points are available yet.<br />Please check back later.</p>
                  <button
                    onClick={() => signOut()}
                    className="text-sm font-semibold text-red-500 hover:text-red-600 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 mb-7">
                  {collectionPoints.map((point, i) => {
                    const isSelected = selectedCP === point;
                    return (
                      <button
                        key={point}
                        onClick={() => setSelectedCP(point)}
                        className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 transition-all duration-150 text-left animate-fade-in-up ${
                          isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                        }`}
                        style={{ animationDelay: `${i * 60}ms` }}
                      >
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-primary-500' : 'bg-white border border-gray-200'
                        }`}>
                          {isSelected
                            ? <CheckCircle2 className="w-5 h-5 text-white" />
                            : <MapPin className="w-4 h-4 text-gray-400" />
                          }
                        </div>
                        <span className={`font-semibold text-sm ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                          {point}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={async () => {
                  if (!selectedCP || saving) return;
                  setSaving(true);
                  try {
                    await updateCP({ collectionPoint: selectedCP });
                    router.replace('/store');
                  } catch {
                    setSaving(false);
                  }
                }}
                disabled={!selectedCP || saving}
                className="w-full py-3.5 bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white rounded-2xl font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Confirm & Continue</span>
                    <span className="text-white/70">→</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            You can change this later from your account settings
          </p>
        </div>
      </div>
    );
  }

  return <Spinner />;
}

function Spinner() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 bg-primary-50 rounded-2xl flex items-center justify-center overflow-hidden">
          <img src="/logo.png" alt="SquadBid" className="w-full h-full object-contain mix-blend-multiply" />
        </div>
        <Loader2 className="w-5 h-5 text-primary-400 animate-spin" />
      </div>
    </div>
  );
}
