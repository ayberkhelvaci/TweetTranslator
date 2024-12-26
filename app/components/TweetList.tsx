import React, { useState, useEffect } from 'react';
import { TweetCard } from './TweetCard';

type TweetStatus = 'pending' | 'translating' | 'translated' | 'posted' | 'failed' | 'queued';
type FilterType = 'all' | 'translated' | 'queued' | 'posted';

interface Tweet {
  id: string;
  source_tweet_id: string;
  original_text: string;
  translated_text?: string;
  status: TweetStatus;
  error_message?: string;
  created_at: string;
  image_urls?: string[];
  author_name: string;
  author_username: string;
  author_profile_image: string;
  scheduled_time?: string;
}

export function TweetList() {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTweets();
  }, []);

  async function fetchTweets() {
    try {
      const response = await fetch('/api/tweets');
      if (!response.ok) {
        throw new Error('Failed to fetch tweets');
      }
      const data = await response.json();
      setTweets(data);
    } catch (error) {
      console.error('Error fetching tweets:', error);
      setError('Failed to load tweets');
    } finally {
      setLoading(false);
    }
  }

  async function handleTranslateAndPost(tweetId: string) {
    try {
      // Get the current tweet
      const currentTweet = tweets.find(t => t.source_tweet_id === tweetId);
      
      if (!currentTweet) return;

      // If we're translating (status is pending)
      if (currentTweet.status === 'pending') {
        setTweets(prev => prev.map(tweet => 
          tweet.source_tweet_id === tweetId 
            ? { ...tweet, status: 'translating' } 
            : tweet
        ));

        // Fetch updated tweet data after translation
        const response = await fetch('/api/tweets');
        if (!response.ok) {
          throw new Error('Failed to fetch tweets');
        }
        const data = await response.json();
        setTweets(data);
        return;
      }

      // If we're posting (status is translated)
      if (currentTweet.status === 'translated') {
        // Update local state first to show posting status
        setTweets(prev => prev.map(tweet => 
          tweet.source_tweet_id === tweetId 
            ? { ...tweet, status: 'queued' } 
            : tweet
        ));

        // Wait a moment to ensure database update is complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Fetch fresh data to confirm the update
        const response = await fetch('/api/tweets');
        if (!response.ok) {
          throw new Error('Failed to fetch tweets');
        }
        const data = await response.json();

        // Update tweets while preserving queued status
        setTweets(data.map((tweet: Tweet) => 
          tweet.source_tweet_id === tweetId && currentTweet.status === 'queued'
            ? { ...tweet, status: 'queued' }
            : tweet
        ));
      }
    } catch (error) {
      console.error('Error updating tweets:', error);
      setError('Failed to update tweets');
    }
  }

  const filteredTweets = tweets.filter(tweet => {
    switch (filter) {
      case 'translated':
        return tweet.status === 'translated';
      case 'posted':
        return tweet.status === 'posted';
      case 'queued':
        return tweet.status === 'queued';
      default:
        return true;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Tweet History</h2>
        <div className="flex space-x-2">
          {(['all', 'translated', 'queued', 'posted'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-6 py-2 text-sm font-medium rounded-xl transition-colors
                ${filter === filterType
                  ? 'bg-black text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {filterType === 'all' ? 'All' : filterType.charAt(0).toUpperCase() + filterType.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600">
          {error}
        </div>
      ) : filteredTweets.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-100">
          <p className="text-gray-500">No tweets found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTweets.map((tweet) => (
            <TweetCard
              key={tweet.source_tweet_id}
              tweet={tweet}
              onTranslateAndPost={handleTranslateAndPost}
            />
          ))}
        </div>
      )}
    </div>
  );
} 