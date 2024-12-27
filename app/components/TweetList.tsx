import React from 'react';
import { TweetCard } from './TweetCard';
import { Tweet } from '../../types/tweet';

interface TweetListProps {
  tweets: Tweet[];
  onTranslateAndPost?: (tweetId: string) => void;
}

export function TweetList({ tweets, onTranslateAndPost }: TweetListProps) {
  return (
    <div className="space-y-4">
      {tweets.map((tweet) => (
        <TweetCard
          key={tweet.id}
          tweet={tweet}
          onTranslateAndPost={onTranslateAndPost}
        />
      ))}
    </div>
  );
} 