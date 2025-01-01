import React from 'react';
import { TweetCard } from './TweetCard';
import { Tweet } from '../../types/tweet';

export function QueueSection({ tweets, onRemoveFromQueue }: {
  tweets: Tweet[];
  onRemoveFromQueue?: (id: string) => void;
}) {
  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-xl font-semibold text-white">Translation Queue</h2>
      <div className="space-y-4">
        {tweets.map((tweet) => (
          <TweetCard
            key={tweet.source_tweet_id}
            tweet={tweet}
            onTranslate={() => {}}
            onPost={() => onRemoveFromQueue?.(tweet.source_tweet_id)}
          />
        ))}
      </div>
    </div>
  );
}
