import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import Image from 'next/image';

export function UserMenu() {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  if (!session?.user) {
    return (
      <div className="relative">
        <button
          onClick={handleSignIn}
          disabled={isLoading}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Please wait...' : 'Sign in with Twitter'}
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        {session.user.image && (
          <Image
            src={session.user.image}
            alt={session.user.name || 'User'}
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        <span className="text-gray-700">{session.user.name}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 border border-gray-100">
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{session.user.name}</p>
            <p className="text-sm text-gray-500">{session.user.email}</p>
          </div>
          <button
            onClick={handleSwitchAccount}
            disabled={isLoading}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Switching...' : 'Switch Twitter Account'}
          </button>
          <button
            onClick={() => signOut()}
            disabled={isLoading}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100 disabled:opacity-50"
          >
            {isLoading ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
} 