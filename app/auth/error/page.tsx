'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');

  useEffect(() => {
    // Log the error details
    console.error('Auth error occurred:', {
      error,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer
    });
  }, [error]);

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case 'missing_params':
        return 'Authentication parameters are missing. Please try signing in again.';
      case 'callback_failed':
        return 'Authentication callback failed. This might be due to invalid or expired credentials.';
      case 'Configuration':
        return 'There is a problem with the Twitter authentication configuration.';
      case 'AccessDenied':
        return 'Access was denied to your Twitter account. Please try again and make sure to approve the required permissions.';
      case 'Callback':
        return 'There was a problem during the authentication process. Please try again.';
      default:
        return 'An unexpected authentication error occurred. Please try again.';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Authentication Error
        </h2>
        <div className="mt-8 bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Error Details
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{getErrorMessage(error)}</p>
                  {error && (
                    <p className="mt-1 text-xs text-red-500">
                      Error code: {error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <a
              href="/auth/signin"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Try Again
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 