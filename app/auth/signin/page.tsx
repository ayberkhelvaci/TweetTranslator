'use client';
import React from 'react';
import { signIn, signOut } from 'next-auth/react';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');

  const handleSignIn = async () => {
    try {
      setIsLoading(true);
      await signIn('twitter', {
        callbackUrl: '/',
        redirect: true,
        authorization: {
          params: {
            prompt: "login consent",
            force_login: "true"
          }
        }
      });
    } catch (error) {
      console.error('Sign in error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      setIsLoading(true);
      // Clear existing Twitter tokens
      await fetch('/api/twitter/revoke', { method: 'POST' });
      
      // Sign out the current session
      await signOut({ redirect: false });
      
      // Sign in with force_login and prompt
      await signIn('twitter', {
        callbackUrl: '/',
        redirect: true,
        authorization: {
          params: {
            prompt: "login consent",
            force_login: "true"
          }
        }
      });
    } catch (error) {
      console.error('Error switching account:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Tweet Translator
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Automatically translate and manage your tweets
          </p>
        </div>
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">
              {error === 'OAuthSignin' && 'An error occurred while signing in with Twitter.'}
              {error === 'OAuthCallback' && 'An error occurred while processing the Twitter callback.'}
              {error === 'OAuthCreateAccount' && 'Could not create a Twitter account.'}
              {error === 'EmailSignin' && 'The email sign in link is invalid or has expired.'}
              {error === 'Callback' && 'The Twitter callback encountered an error.'}
              {error === 'Default' && 'An unexpected error occurred.'}
            </div>
          </div>
        )}
        <div className="mt-8 space-y-4">
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isLoading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg
                className="h-5 w-5 text-blue-400 group-hover:text-blue-300"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </span>
            {isLoading ? 'Signing in...' : 'Sign in with Twitter'}
          </button>

          <button
            onClick={handleSwitchAccount}
            disabled={isLoading}
            className={`group relative w-full flex justify-center py-3 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isLoading ? 'opacity-75 cursor-not-allowed' : ''
            }`}
          >
            <span className="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg
                className="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </span>
            {isLoading ? 'Switching...' : 'Use Different Account'}
          </button>
        </div>
      </div>
    </div>
  );
} 