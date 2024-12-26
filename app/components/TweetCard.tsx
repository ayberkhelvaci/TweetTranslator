'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { TranslationModal } from './TranslationModal';

interface Tweet {
  source_tweet_id: string;
  original_text: string;
  translated_text?: string;
  status: 'pending' | 'translating' | 'translated' | 'posted' | 'failed' | 'queued';
  error_message?: string;
  created_at: string;
  retry_after?: string;
  image_urls?: string[];
  author?: {
    username: string;
    name: string;
    profile_image_url: string;
  };
}

interface TweetCardProps {
  tweet: Tweet;
  onTranslateAndPost?: (tweetId: string) => void;
  onAction?: () => void;
  actionLabel?: string;
}

export function TweetCard({ 
  tweet: initialTweet, 
  onTranslateAndPost,
  onAction,
  actionLabel
}: TweetCardProps) {
  const [tweet, setTweet] = useState<Tweet>(initialTweet);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Update local tweet when prop changes, but preserve posted status
  useEffect(() => {
    setTweet(prev => {
      // If the tweet was already posted, keep it posted
      if (prev.status === 'posted') {
        return { ...initialTweet, status: 'posted' };
      }
      return initialTweet;
    });
  }, [initialTweet]);

  const getStatusBadge = (status: Tweet['status']) => {
    if (isPosting) return 'Posting...';
    switch (status) {
      case 'pending':
        return 'Status: Pending Action';
      case 'translating':
        return 'Translating...';
      case 'translated':
        return 'Ready to Post';
      case 'posted':
        return 'Posted';
      case 'failed':
        return 'Failed';
      case 'queued':
        return 'Queued for Posting';
      default:
        return status;
    }
  };

  const getStatusColor = (status: Tweet['status']) => {
    if (isPosting) return 'bg-blue-100 text-blue-700';
    switch (status) {
      case 'queued':
        return 'bg-yellow-100 text-yellow-700';
      case 'posted':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const handleTranslateOrCheck = async () => {
    if (tweet.status === 'pending') {
      // If pending, initiate translation
      setIsTranslating(true);
      setTranslationError(null);

      try {
        const response = await fetch('/api/translate/preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tweetId: tweet.source_tweet_id }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to translate tweet');
        }

        // Don't show modal immediately after first translation
        onTranslateAndPost?.(tweet.source_tweet_id); // Refresh tweet list to show new status
      } catch (error) {
        console.error('Error translating tweet:', error);
        setTranslationError(error instanceof Error ? error.message : 'Failed to translate tweet');
      } finally {
        setIsTranslating(false);
      }
    } else {
      // If already translated, show preview
      setIsTranslationModalOpen(true);
    }
  };

  const handlePostManually = async () => {
    if (isPosting) return; // Prevent double posting
    
    try {
      setIsPosting(true);
      setTranslationError(null);

      const response = await fetch('/api/tweets/post', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tweetId: tweet.source_tweet_id }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.includes('duplicate content')) {
          // If it's a duplicate, mark as posted immediately
          setTweet(prev => ({ ...prev, status: 'posted' }));
          setTranslationError('Tweet was already posted');
          // Refresh to ensure database is updated
          onTranslateAndPost?.(tweet.source_tweet_id);
          return;
        }
        throw new Error(data.error || 'Failed to post tweet');
      }

      // If post was successful, update local state and ensure database is updated
      if (data.status === 'posted') {
        setTweet(prev => ({ 
          ...prev, 
          status: 'posted',
          posted_tweet_id: data.tweetId 
        }));
        setTranslationError(null);
        // Refresh to ensure database is updated
        onTranslateAndPost?.(tweet.source_tweet_id);
      }
    } catch (error) {
      console.error('Error posting tweet:', error);
      setTranslationError(error instanceof Error ? error.message : 'Failed to post tweet');
      // Refresh to get the current status
      onTranslateAndPost?.(tweet.source_tweet_id);
    } finally {
      setIsPosting(false);
    }
  };

  const getTranslateButtonText = () => {
    if (isTranslating) return 'Translating...';
    if (tweet.status === 'pending') return 'Translate Manually';
    return 'Check Translation';
  };

  return (
    <>
      <div className="bg-white rounded-2xl p-6 space-y-4">
        {/* Date and Status */}
        <div className="flex justify-between items-center">
          <div className="text-gray-600">
            {format(new Date(tweet.created_at), 'MMMM d, yyyy')}
          </div>
          <div className={`px-4 py-1.5 rounded-full text-sm ${getStatusColor(tweet.status)}`}>
            {getStatusBadge(tweet.status)}
            {tweet.retry_after && tweet.status === 'queued' && (
              <span className="ml-1 text-xs">
                (Retry at {format(new Date(tweet.retry_after), 'HH:mm')})
              </span>
            )}
          </div>
        </div>

        {/* Author Info */}
        {tweet.author && (
          <div className="flex items-center space-x-3">
            <Image
              src={tweet.author.profile_image_url}
              alt={tweet.author.name}
              width={48}
              height={48}
              className="rounded-full"
            />
            <div>
              <div className="font-semibold text-lg">{tweet.author.name}</div>
              <div className="text-gray-600">@{tweet.author.username}</div>
            </div>
          </div>
        )}

        {/* Tweet Content */}
        <div className="text-gray-800 text-lg">
          {tweet.original_text}
        </div>

        {/* Images */}
        {tweet.image_urls && tweet.image_urls.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {tweet.image_urls.map((url, index) => (
              <div key={index} className="relative aspect-square">
                <Image
                  src={url}
                  alt="Tweet image"
                  fill
                  className="object-cover rounded-xl"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {tweet.status !== 'posted' && (
          <div className="flex space-x-4 pt-4">
            {tweet.status !== 'queued' ? (
              <>
                <button
                  onClick={handleTranslateOrCheck}
                  disabled={isTranslating}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{getTranslateButtonText()}</span>
                  <span>→</span>
                </button>
                <button
                  onClick={handlePostManually}
                  disabled={tweet.status !== 'translated'}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Post Manually</span>
                  <span>✕</span>
                </button>
              </>
            ) : onAction && (
              <button
                onClick={onAction}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors"
              >
                <span>{actionLabel || 'Remove from Queue'}</span>
                <span>✕</span>
              </button>
            )}
          </div>
        )}

        {/* Error Message */}
        {translationError && (
          <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg">
            {translationError}
          </div>
        )}
      </div>

      {/* Translation Modal */}
      <TranslationModal
        isOpen={isTranslationModalOpen}
        onClose={() => setIsTranslationModalOpen(false)}
        tweet={tweet}
        onPost={handlePostManually}
      />
    </>
  );
} 