'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface TwitterKeys {
  twitter_api?: string;
  twitter_api_secret?: string;
  twitter_access_token?: string;
  twitter_access_secret?: string;
}

interface VisibilityState {
  twitter_api: boolean;
  twitter_api_secret: boolean;
  twitter_access_token: boolean;
  twitter_access_secret: boolean;
}

export default function ApiKeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [keys, setKeys] = useState<TwitterKeys>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [visibility, setVisibility] = useState<VisibilityState>({
    twitter_api: false,
    twitter_api_secret: false,
    twitter_access_token: false,
    twitter_access_secret: false
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchKeys();
    }
  }, [status, router]);

  async function fetchKeys() {
    try {
      const response = await fetch('/api/keys');
      if (!response.ok) {
        throw new Error('Failed to fetch API keys');
      }
      const data = await response.json();
      setKeys({
        twitter_api: data.api_key || '',
        twitter_api_secret: data.api_secret || '',
        twitter_access_token: data.access_token || '',
        twitter_access_secret: data.access_token_secret || '',
      });
    } catch (error) {
      console.error('Error fetching keys:', error);
      setError('Failed to load API keys');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(keys),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save API keys');
      }

      setSuccess('API keys saved successfully');
    } catch (error) {
      console.error('Error saving keys:', error);
      setError(error instanceof Error ? error.message : 'Failed to save API keys');
    } finally {
      setLoading(false);
    }
  }

  const toggleVisibility = (field: keyof VisibilityState) => {
    setVisibility(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (status === 'loading') {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Twitter API Keys</h1>
      
      <div className="bg-white p-6 rounded-lg shadow mb-8">
        <h2 className="text-lg font-semibold mb-4">How to get your Twitter API keys:</h2>
        <ol className="list-decimal list-inside space-y-2 text-gray-700">
          <li>Go to the <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Twitter Developer Portal</a></li>
          <li>Create a new project and app if you haven't already</li>
          <li>In your app settings, find the "Keys and tokens" section</li>
          <li>Generate "Consumer Keys" (API Key and Secret)</li>
          <li>Generate "Access Token and Secret"</li>
          <li>Copy each value to the corresponding field below</li>
        </ol>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {[
              { key: 'twitter_api', label: 'API Key (Consumer Key)' },
              { key: 'twitter_api_secret', label: 'API Secret (Consumer Secret)' },
              { key: 'twitter_access_token', label: 'Access Token' },
              { key: 'twitter_access_secret', label: 'Access Token Secret' }
            ].map(({ key, label }) => (
              <div key={key} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {label}
                </label>
                <div className="relative">
                  <input
                    type={visibility[key as keyof VisibilityState] ? 'text' : 'password'}
                    value={keys[key as keyof TwitterKeys] || ''}
                    onChange={e => setKeys(k => ({ ...k, [key]: e.target.value }))}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => toggleVisibility(key as keyof VisibilityState)}
                    className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700"
                  >
                    {visibility[key as keyof VisibilityState] ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            ))}

            {error && (
              <div className="p-3 bg-red-100 text-red-700 rounded">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 bg-green-100 text-green-700 rounded">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2 px-4 rounded bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Saving...' : 'Save API Keys'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 