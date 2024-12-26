'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import React from 'react';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');

  const getErrorMessage = (error: string) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration. Please try again later.';
      case 'AccessDenied':
        return 'You denied access to your Twitter account. Please try again and approve the access.';
      case 'Database':
        return 'There was a problem with our database. Please try again later.';
      case 'Callback':
        return 'There was a problem with the Twitter authentication. Please try again.';
      case 'OAuthSignin':
        return 'Could not initiate Twitter sign in. Please try again.';
      case 'OAuthCallback':
        return 'Could not verify Twitter authentication. Please try again.';
      case 'OAuthCreateAccount':
        return 'Could not create user account. Please try again.';
      case 'SessionRequired':
        return 'Please sign in to access this page.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Authentication Error
          </h2>
          <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-center text-sm text-red-700">
              {getErrorMessage(error || '')}
            </p>
          </div>
          <div className="mt-6 text-center">
            <Link
              href="/auth/signin"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Try Again
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 