'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { TranslationModal } from './TranslationModal';
import { Tweet } from '../../types/tweet';

interface TweetCardProps {
  tweet: Tweet;
  onTranslate: () => void;
  onPost: () => void;
}

export function TweetCard({ 
  tweet: initialTweet, 
  onTranslate,
  onPost
}: TweetCardProps) {
  const [tweet, setTweet] = useState<Tweet>(initialTweet);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // Update local tweet when prop changes
  useEffect(() => {
    setTweet(initialTweet);
  }, [initialTweet]);

  const getStatusBadge = (status: Tweet['status']) => {
    if (isPosting) return 'Posting...';
    switch (status) {
      case 'pending':
        return 'Pending Action';
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

  const getStatusStyle = (status: Tweet['status']) => {
    if (isPosting) return 'bg-blue-50 text-blue-600';
    switch (status) {
      case 'pending':
        return 'bg-rose-50 text-rose-600';
      case 'translating':
        return 'bg-blue-50 text-blue-600';
      case 'translated':
        return 'bg-amber-50 text-amber-600';
      case 'posted':
        return 'bg-green-50 text-green-600';
      case 'failed':
        return 'bg-red-50 text-red-600';
      case 'queued':
        return 'bg-yellow-50 text-yellow-600';
      default:
        return 'bg-gray-50 text-gray-600';
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
        onTranslate(); // Refresh tweet list to show new status
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
          onTranslate();
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
        onTranslate();
      }
    } catch (error) {
      console.error('Error posting tweet:', error);
      setTranslationError(error instanceof Error ? error.message : 'Failed to post tweet');
      // Refresh to get the current status
      onTranslate();
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
          <div className={`px-4 py-1.5 rounded-full text-sm font-medium ${getStatusStyle(tweet.status)}`}>
            {getStatusBadge(tweet.status)}
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
        <div className="flex space-x-4">
          <button
            onClick={handleTranslateOrCheck}
            disabled={isTranslating}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
          >
            <span>{tweet.status === 'pending' ? 'Translate Manually' : 'Check Translation'}</span>
            <span>→</span>
          </button>
          {tweet.status === 'translated' && (
            <button
              onClick={handlePostManually}
              disabled={isPosting}
              className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-600 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
            >
              <span>Post Tweet</span>
              <span>→</span>
            </button>
          )}
        </div>

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
        onTranslate={onTranslate}
        error={translationError}
      />
    </>
  );
} 