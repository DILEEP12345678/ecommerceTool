'use client';

import { useQuery } from 'convex/react';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSetUser, useUser } from '../components/UserContext';
import { api } from '../convex/_generated/api';

export default function LoginPage() {
  const router = useRouter();
  const user = useUser();
  const setUser = useSetUser();
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedCollectionPoint, setSelectedCollectionPoint] = useState('');
  const [showCollectionPointSelection, setShowCollectionPointSelection] = useState(false);

  const collectionPoints = useQuery(api.users.getCollectionPoints);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === 'collection_point_manager') {
        router.push('/collection-point');
      } else {
        router.push('/store');
      }
    }
  }, [user, router]);

  const testUsers = [
    {
      email: 'customer1@test.com',
      name: 'Customer One',
      role: 'customer' as const,
    },
    {
      email: 'customer2@test.com',
      name: 'Customer Two',
      role: 'customer' as const,
    },
    {
      email: 'customer3@test.com',
      name: 'Customer Three',
      role: 'customer' as const,
    },
    {
      email: 'cp.north@test.com',
      name: 'North Point Manager',
      role: 'collection_point_manager' as const,
      collectionPoint: 'North Collection Point',
    },
    {
      email: 'cp.south@test.com',
      name: 'South Point Manager',
      role: 'collection_point_manager' as const,
      collectionPoint: 'South Collection Point',
    },
    {
      email: 'cp.east@test.com',
      name: 'East Point Manager',
      role: 'collection_point_manager' as const,
      collectionPoint: 'East Collection Point',
    },
    {
      email: 'cp.west@test.com',
      name: 'West Point Manager',
      role: 'collection_point_manager' as const,
      collectionPoint: 'West Collection Point',
    },
  ];

  const handleUserSelection = () => {
    if (!selectedUser) {
      alert('Please select a user');
      return;
    }

    const userData = testUsers.find((u) => u.email === selectedUser);
    if (userData) {
      if (userData.role === 'collection_point_manager') {
        // Managers don't need to select collection point
        setUser(userData);
        router.push('/collection-point');
      } else {
        // Customers need to select collection point
        setShowCollectionPointSelection(true);
      }
    }
  };

  const handleLogin = () => {
    if (!selectedCollectionPoint) {
      alert('Please select a collection point');
      return;
    }

    const userData = testUsers.find((u) => u.email === selectedUser);
    if (userData) {
      // Set user with selected collection point
      setUser({
        ...userData,
        collectionPoint: selectedCollectionPoint,
      });
      router.push('/store');
    }
  };

  if (showCollectionPointSelection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Select Collection Point
          </h1>
          <p className="text-gray-600 mb-8 text-center">
            Choose your nearest collection point for order pickup
          </p>

          {!collectionPoints ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            </div>
          ) : collectionPoints.length === 0 ? (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-2">
                ⚠️ No collection points available
              </p>
              <p className="text-xs text-yellow-700">
                Please initialize test users first.
              </p>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {collectionPoints.map((point) => (
                <label
                  key={point}
                  className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  style={{
                    borderColor:
                      selectedCollectionPoint === point ? '#3b82f6' : '#e5e7eb',
                  }}
                >
                  <input
                    type="radio"
                    name="collectionPoint"
                    value={point}
                    checked={selectedCollectionPoint === point}
                    onChange={(e) => setSelectedCollectionPoint(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="font-semibold text-gray-900">{point}</span>
                </label>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowCollectionPointSelection(false);
                setSelectedCollectionPoint('');
              }}
              className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold"
            >
              Back
            </button>
            <button
              onClick={handleLogin}
              disabled={!selectedCollectionPoint}
              className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 text-center">
          Welcome Back
        </h1>
        <p className="text-gray-600 mb-8 text-center">
          Select a test account to login
        </p>

        {/* Accounts - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Customer Accounts */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Customer Accounts
            </h2>
            <div className="space-y-2">
              {testUsers
                .filter((u) => u.role === 'customer')
                .map((userData) => (
                  <label
                    key={userData.email}
                    className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{
                      borderColor:
                        selectedUser === userData.email ? '#3b82f6' : '#e5e7eb',
                    }}
                  >
                    <input
                      type="radio"
                      name="user"
                      value={userData.email}
                      checked={selectedUser === userData.email}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{userData.name}</p>
                      <p className="text-xs text-gray-500">{userData.email}</p>
                    </div>
                  </label>
                ))}
            </div>
          </div>

          {/* Collection Point Manager Accounts */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Collection Point Managers
            </h2>
            <div className="space-y-2">
              {testUsers
                .filter((u) => u.role === 'collection_point_manager')
                .map((userData) => (
                  <label
                    key={userData.email}
                    className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{
                      borderColor:
                        selectedUser === userData.email ? '#3b82f6' : '#e5e7eb',
                    }}
                  >
                    <input
                      type="radio"
                      name="user"
                      value={userData.email}
                      checked={selectedUser === userData.email}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className="w-4 h-4"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{userData.name}</p>
                      <p className="text-xs text-gray-500">{userData.email}</p>
                      <p className="text-xs text-blue-600">{userData.collectionPoint}</p>
                    </div>
                  </label>
                ))}
            </div>
          </div>
        </div>

        {/* Login Button */}
        <button
          onClick={handleUserSelection}
          className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
