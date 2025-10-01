"use client";

import React from 'react';
import { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, User, Auth } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { setUserRole as setUserRoleAuth } from '../../lib/userRole';

export default function Login() {
  const [email, setEmail] = useState('admin@phc.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const authInstance = auth as Auth;

  useEffect(() => {
    // Check if user is already logged in
    if (authInstance) {
      const unsubscribe = authInstance.onAuthStateChanged((user: User | null) => {
        if (user) {
          router.push('/');
        }
      });

      return () => unsubscribe();
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!authInstance) {
        throw new Error('Firebase auth is not initialized');
      }

      let userCredential;
      try {
        // Try to sign in first
        userCredential = await signInWithEmailAndPassword(authInstance, email, password);
      } catch (signInError: any) {
        // If user doesn't exist, create a new account
        if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
          try {
            userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
            console.log('New user created successfully');
          } catch (createError: any) {
            if (createError.code === 'auth/email-already-in-use') {
              // If we get here, the password might be wrong
              throw new Error('Invalid password');
            }
            throw createError;
          }
        } else {
          throw signInError;
        }
      }
      
      // Set user role as 'phc' for dashboard users
      await setUserRoleAuth('phc');
      
      // Force token refresh to get updated claims
      await userCredential.user.getIdToken(true);
      
      router.push('/');
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <span className="text-2xl">🏥</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            PHC Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to access ASHA EHR management
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="mt-4">
            <div className="rounded-md bg-blue-50 p-4">
              <div className="text-sm text-blue-700">
                <p>Default admin credentials are pre-filled.</p>
                <p>Email: admin@phc.com</p>
                <p>Password: password123</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              Demo credentials: admin@phc.com / password123
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

