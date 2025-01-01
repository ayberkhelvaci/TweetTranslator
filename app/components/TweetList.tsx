'use client';

import { useState } from 'react';
import { Tweet } from '@/types/tweet';
import { TweetCard } from './TweetCard';

type TweetStatus = 'all' | 'pending' | 'translated' | 'posted' | 'queued';

interface TweetListProps {
  tweets: Tweet[];
  onTranslate: (tweet: Tweet) => void;
  onPost: (tweet: Tweet) => void;
}

export function TweetList({ tweets, onTranslate, onPost }: TweetListProps) {
  const [activeTab, setActiveTab] = useState<TweetStatus>('all');

  const filteredTweets = tweets.filter(tweet => {
    if (activeTab === 'all') return true;
    return tweet.status === activeTab;
  });

  const tabStyle = (tab: TweetStatus) => `
    px-4 py-2 text-sm font-medium rounded-md
    ${activeTab === tab 
      ? 'bg-blue-100 text-blue-700' 
      : 'text-gray-500 hover:text-gray-700'}
  `;

  return (
    <div className="space-y-4">
      <div className="flex space-x-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('all')}
          className={tabStyle('all')}
        >
          All Tweets
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={tabStyle('pending')}
        >
          Pending
        </button>
        <button
          onClick={() => setActiveTab('translated')}
          className={tabStyle('translated')}
        >
          Translated
        </button>
        <button
          onClick={() => setActiveTab('posted')}
          className={tabStyle('posted')}
        >
          Posted
        </button>
        <button
          onClick={() => setActiveTab('queued')}
          className={tabStyle('queued')}
        >
          Queued
        </button>
      </div>

      <div className="space-y-4">
        {filteredTweets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tweets found for this filter
          </div>
        ) : (
          filteredTweets.map((tweet) => (
            <TweetCard
              key={tweet.source_tweet_id}
              tweet={tweet}
              onTranslate={() => onTranslate(tweet)}
              onPost={() => onPost(tweet)}
            />
          ))
        )}
      </div>
    </div>
  );
} 