'use client';

import React from 'react';

interface TweetProps {
  authorName: string;
  authorUsername: string;
  authorImage: string;
  content: string;
  translation?: string | null;
  timestamp: string;
  images?: string[];
  status?: 'pending' | 'translated' | 'failed';
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const tweetDate = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - tweetDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}m`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}h`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}d`;
  } else {
    return tweetDate.toLocaleDateString();
  }
}

function ImageGrid({ images }: { images: string[] }) {
  if (images.length === 0) return null;

  const gridConfig = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-2',
    4: 'grid-cols-2'
  };

  return (
    <div className={`grid gap-0.5 mt-3 ${gridConfig[Math.min(images.length, 4) as 1|2|3|4]}`}>
      {images.map((image, index) => (
        <div
          key={index}
          className={`relative ${
            images.length === 3 && index === 0 ? 'col-span-2' : ''
          }`}
        >
          <img
            src={image}
            alt={`Tweet image ${index + 1}`}
            className="rounded-lg w-full h-full object-cover"
            style={{ aspectRatio: '16/9' }}
          />
        </div>
      ))}
    </div>
  );
}

export function Tweet({
  authorName,
  authorUsername,
  authorImage,
  content,
  translation,
  timestamp,
  images = [],
  status = 'pending'
}: TweetProps) {
  return (
    <article className="bg-white border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition-colors">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <img
            src={authorImage}
            alt={authorName}
            className="w-12 h-12 rounded-full"
          />
        </div>
        
        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-1 text-sm leading-tight">
            <span className="font-bold text-gray-900 hover:underline">
              {authorName}
            </span>
            <span className="text-gray-500">@{authorUsername}</span>
            <span className="text-gray-500">·</span>
            <time className="text-gray-500 hover:underline" dateTime={timestamp}>
              {formatRelativeTime(timestamp)}
            </time>
          </div>

          <div className="mt-2 text-gray-900 whitespace-pre-wrap break-words">
            {content}
          </div>

          {translation && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                Translated
                {status === 'pending' && <span className="text-yellow-500">· Translating...</span>}
                {status === 'failed' && <span className="text-red-500">· Failed to translate</span>}
              </div>
              <div className="text-gray-900">
                {translation}
              </div>
            </div>
          )}

          <ImageGrid images={images} />
        </div>
      </div>
    </article>
  );
}

export default Tweet; 