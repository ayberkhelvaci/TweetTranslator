'use client';

import React, { useState, useEffect } from 'react';
import { TweetList } from './components/TweetList';
import { ConfigurationForm } from './components/ConfigurationForm';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Tweet } from '../types/tweet';

interface ConfigFormData {
  source_account: string;
  check_interval: number;
  target_language: string;
  registration_timestamp?: string;
}

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<string>('Active & Working');
  const [initialConfig, setInitialConfig] = useState<ConfigFormData | null>(null);
  const [tweets, setTweets] = useState<Tweet[]>([]);

  React.useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      // Load existing configuration
      fetchConfig();
      fetchTweets();
    }
  }, [status, router]);

  const fetchTweets = async () => {
    try {
      const response = await fetch('/api/tweets');
      if (!response.ok) {
        throw new Error('Failed to fetch tweets');
      }
      const data = await response.json();
      setTweets(data);
    } catch (error) {
      console.error('Error fetching tweets:', error);
    }
  };

  const handleTranslateAndPost = async (tweetId: string) => {
    try {
      const response = await fetch(`/api/tweets/${tweetId}/translate`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to translate and post tweet');
      }
      // Refresh tweets after translation/posting
      fetchTweets();
    } catch (error) {
      console.error('Error translating/posting tweet:', error);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error('Failed to fetch configuration');
      }
      const data = await response.json();
      if (data.source_account) {
        setInitialConfig(data);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    }
  };

  const handleSubmit = async (formData: ConfigFormData) => {
    try {
      setError(null);
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source_account: formData.source_account,
          check_interval: formData.check_interval,
          target_language: formData.target_language,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      // Refresh the configuration after saving
      await fetchConfig();

      return data;
    } catch (error) {
      console.error('Error saving configuration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save configuration';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* API Information */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">API Information</h2>
            <div className="px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
              {apiStatus}
            </div>
          </div>
        </div>

        {/* Configuration Section */}
        <div className="bg-black rounded-2xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Configuration</h2>
          <ConfigurationForm onSubmit={handleSubmit} initialData={initialConfig || undefined} />
          {error && (
            <div className="mt-4 p-3 bg-red-900 text-red-200 rounded-xl">
              {error}
            </div>
          )}
        </div>

        {/* Tweet List */}
        <div className="space-y-4">
          <TweetList tweets={tweets} onTranslateAndPost={handleTranslateAndPost} />
        </div>
      </div>
    </main>
  );
} 