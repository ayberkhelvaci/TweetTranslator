'use client';

import { useState } from 'react';
import { Tweet } from '@/types/tweet';
import { TweetCard } from './TweetCard';

type TweetStatus = 'all' | 'pending' | 'translated' | 'posted' | 'queued';

interface TweetListProps {
  tweets: Tweet[];
  onTweetUpdate: (tweet: Tweet) => void;
}

export function TweetList({ tweets, onTweetUpdate }: TweetListProps) {
  const [selectedStatus, setSelectedStatus] = useState<TweetStatus>('all');

  // Filter tweets based on status
  const filteredTweets = tweets.filter(tweet => {
    if (selectedStatus === 'all') return true;
    return tweet.status === selectedStatus;
  });

  // First, sort all tweets by creation date (newest first)
  const sortedTweets = [...filteredTweets].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // Group tweets by thread_id
  const groupedTweets = sortedTweets.reduce((acc, tweet) => {
    if (!tweet.thread_id) {
      // If no thread_id, treat as standalone tweet
      acc[tweet.id] = [tweet];
      return acc;
    }

    const key = tweet.thread_id;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(tweet);
    return acc;
  }, {} as Record<string, Tweet[]>);

  // Sort tweets within each thread by thread_position
  Object.values(groupedTweets).forEach(threadTweets => {
    threadTweets.sort((a, b) => {
      // If thread_position is available, use it
      if (a.thread_position !== undefined && b.thread_position !== undefined) {
        return a.thread_position - b.thread_position;
      }
      // Fall back to creation date if thread_position is not available
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  });

  // Get the earliest tweet from each thread for sorting
  const threadStartDates = Object.entries(groupedTweets).reduce((acc, [threadId, tweets]) => {
    // For non-thread tweets, use their own date
    if (tweets.length === 1 && !tweets[0].thread_id) {
      acc[threadId] = new Date(tweets[0].created_at).getTime();
    } else {
      // For threads, use the date of the first tweet in the thread
      acc[threadId] = Math.max(...tweets.map(t => new Date(t.created_at).getTime()));
    }
    return acc;
  }, {} as Record<string, number>);

  // Sort threads by their start dates (newest first)
  const finalTweets = Object.entries(groupedTweets)
    .sort(([threadIdA], [threadIdB]) => {
      return threadStartDates[threadIdB] - threadStartDates[threadIdA];
    })
    .flatMap(([_, threadTweets]) => threadTweets);

  // Handle tweet updates
  const handleTweetUpdate = async (tweet: Tweet) => {
    try {
      // Fetch the latest tweet data from the database
      const response = await fetch(`/api/tweets/${tweet.source_tweet_id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch updated tweet');
      }
      
      const updatedTweet = await response.json();
      if (onTweetUpdate) {
        onTweetUpdate(updatedTweet);
      }
    } catch (error) {
      console.error('Error updating tweet:', error);
    }
  };

  return (
    <div>
      {/* Status Filter Tabs */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'pending', 'translated', 'posted', 'queued'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              selectedStatus === status
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Tweet List */}
      <div className="space-y-6">
        {finalTweets.map((tweet, index) => (
          <TweetCard
            key={tweet.id}
            tweet={tweet}
            onTranslate={() => handleTweetUpdate(tweet)}
            onPost={() => handleTweetUpdate(tweet)}
            isPartOfThread={!!tweet.thread_id}
            isLastInThread={tweet.is_thread_end || false}
          />
        ))}
      </div>
    </div>
  );
} 