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
  // First, sort all tweets by creation date (newest first)
  const sortedTweets = [...tweets].sort((a, b) => 
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

  // Flatten the grouped tweets back into a single array
  // Keep the overall newest-first order, but keep thread tweets together
  const finalTweets = Object.entries(groupedTweets).flatMap(([threadId, threadTweets]) => {
    // If it's a single tweet (not part of a thread), return as is
    if (threadTweets.length === 1 && !threadTweets[0].thread_id) {
      return threadTweets;
    }
    // Return thread tweets in order
    return threadTweets;
  });

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
  );
} 