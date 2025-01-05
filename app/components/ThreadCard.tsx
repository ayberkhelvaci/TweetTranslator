import React from 'react';
import { Tweet } from '@/types/tweet';
import { TweetCard } from './TweetCard';

interface ThreadCardProps {
  tweets: Tweet[];
  onTranslate: (tweet: Tweet) => void;
  onPost: (tweet: Tweet) => void;
}

export function ThreadCard({ tweets, onTranslate, onPost }: ThreadCardProps) {
  // Sort tweets by thread position
  const sortedTweets = [...tweets].sort((a, b) => 
    (a.thread_position || 0) - (b.thread_position || 0)
  );

  return (
    <div className="relative space-y-4">
      {/* Thread Label */}
      <div className="bg-blue-50 text-blue-600 px-4 py-1 rounded-md text-sm font-medium inline-block">
        Thread Tweet
      </div>

      {/* Thread Line and Tweets */}
      <div className="relative">
        {sortedTweets.map((tweet, index) => (
          <div key={tweet.id} className="relative">
            {/* Vertical connector to previous tweet */}
            {index > 0 && (
              <div className="absolute left-[22px] -top-4 w-[2px] h-8 bg-blue-100" />
            )}

            <div className="flex">
              {/* Number and Line Container */}
              <div className="relative flex-shrink-0 w-12">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm font-medium text-blue-600">
                    {index + 1}
                  </div>
                </div>
              </div>

              {/* Tweet Content */}
              <div className="flex-grow">
                <TweetCard
                  tweet={tweet}
                  onTranslate={() => onTranslate(tweet)}
                  onPost={() => onPost(tweet)}
                  isPartOfThread={false}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 