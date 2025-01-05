'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ConfigurationForm } from '@/app/components/ConfigurationForm';
import { TweetList } from '@/app/components/TweetList';
import { Tweet } from '@/types/tweet';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
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
      setError(error instanceof Error ? error.message : 'Failed to fetch tweets');
    }
  };

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <ConfigurationForm onSubmit={fetchTweets} />
      
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="mt-8">
        <TweetList
          tweets={tweets}
          onTweetUpdate={fetchTweets}
        />
      </div>
    </main>
  );
} 