import React from 'react';
import { TweetCard } from './TweetCard';

interface QueuedTweet {
  id: string;
  source_tweet_id: string;
  original_text: string;
  translated_text: string | null;
  author_name: string;
  author_username: string;
  author_profile_image: string;
  created_at: string;
  status: 'queued';
  scheduled_time?: string;
  image_urls?: string[];
}

interface QueueSectionProps {
  tweets: QueuedTweet[];
  onRemoveFromQueue?: (tweetId: string) => void;
}

export function QueueSection({ tweets, onRemoveFromQueue }: QueueSectionProps) {
  if (tweets.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Queue</h2>
        <p className="text-gray-400 text-center py-4">No tweets in queue</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6">
      <h2 className="text-xl font-semibold text-white mb-4">Queue</h2>
      <div className="space-y-4">
        {tweets.map((tweet) => (
          <TweetCard
            key={tweet.id}
            tweet={tweet}
            onAction={onRemoveFromQueue ? () => onRemoveFromQueue(tweet.id) : undefined}
            actionLabel="Remove from Queue"
          />
        ))}
      </div>
    </div>
  );
}
