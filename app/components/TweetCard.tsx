'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { TranslationModal } from './TranslationModal';
import { PreviewModal } from './PreviewModal';
import { Tweet } from '../../types/tweet';

interface TweetCardProps {
  tweet: Tweet;
  onTranslate: () => void;
  onPost: () => void;
  isPartOfThread?: boolean;
  isLastInThread?: boolean;
}

export function TweetCard({ 
  tweet: initialTweet,
  onTranslate,
  onPost,
  isPartOfThread = false,
  isLastInThread = false
}: TweetCardProps) {
  const [tweet, setTweet] = useState<Tweet>(initialTweet);
  const [isTranslationModalOpen, setIsTranslationModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
    setIsPreviewModalOpen(true);
  };

  const handlePostConfirm = async () => {
    setIsPosting(true);
    try {
      const response = await fetch('/api/tweets/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tweet_id: tweet.id })
      });

      if (!response.ok) {
        throw new Error('Failed to post tweet');
      }

      if (onPost) {
        onPost();
      }
    } catch (error) {
      console.error('Error posting tweet:', error);
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
    <div className="relative">
      {/* Thread Indicator */}
      {tweet.thread_id && (
        <div className="flex items-center space-x-2 mb-2">
          <svg className="w-4 h-4 text-blue-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M19 5v14M5 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="text-blue-600 text-sm font-medium">Thread Tweet</span>
        </div>
      )}

      {/* Thread Line and Card */}
      <div className="flex">
        {/* Thread Line */}
        {tweet.thread_id && (
          <div className="relative flex-shrink-0 w-8">
            <div className="absolute left-3 top-0 bottom-0 w-[2px] bg-blue-100" />
            <div className="absolute left-[9px] top-8 w-3 h-3 rounded-full border-2 border-blue-100 bg-white" />
          </div>
        )}

        {/* Main Card */}
        <div className="flex-grow">
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
                <div className="relative">
                  <Image
                    src={tweet.author.profile_image_url}
                    alt={tweet.author.name}
                    width={48}
                    height={48}
                    className="rounded-full ring-2 ring-white shadow-sm"
                  />
                </div>
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

            {/* Media Grid */}
            {tweet.media_attachments && tweet.media_attachments.length > 0 && (
              <div className="max-w-[400px]">
                <div className={`grid gap-2 ${
                  tweet.media_attachments.length === 1 ? 'grid-cols-1' :
                  tweet.media_attachments.length === 2 ? 'grid-cols-2' :
                  tweet.media_attachments.length === 3 ? 'grid-cols-2' :
                  'grid-cols-2'
                }`}>
                  {tweet.media_attachments.map((media, index) => {
                    const mediaUrl = typeof media === 'string' ? media : media.url;
                    const altText = typeof media === 'string' ? "Tweet image" : (media.alt_text || "Tweet image");
                    
                    return (
                      <div 
                        key={index} 
                        className={`relative cursor-pointer transition-transform hover:scale-[1.02] border border-gray-200 rounded-xl overflow-hidden ${
                          tweet.media_attachments?.length === 3 && index === 0 ? 'col-span-2' : ''
                        }`}
                        style={{ 
                          aspectRatio: tweet.media_attachments?.length === 1 ? '16/9' : '1/1'
                        }}
                        onClick={() => setSelectedImage(mediaUrl)}
                      >
                        <Image
                          src={mediaUrl}
                          alt={altText}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={handleTranslateOrCheck}
                disabled={isTranslating}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium transition-colors disabled:opacity-50"
              >
                <span>{getTranslateButtonText()}</span>
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
        </div>
      </div>

      {/* Translation Modal */}
      <TranslationModal
        isOpen={isTranslationModalOpen}
        onClose={() => setIsTranslationModalOpen(false)}
        tweet={tweet}
        onTranslate={onTranslate}
        error={translationError}
      />

      {/* Preview Modal */}
      <PreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        tweet={tweet}
        onPost={handlePostConfirm}
      />
    </div>
  );
} 