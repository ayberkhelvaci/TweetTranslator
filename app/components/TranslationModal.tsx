import React from 'react';
import { Tweet } from '@/types/tweet';

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tweet: Tweet;
  onTranslate: () => void;
  error: string | null;
}

export function TranslationModal({
  isOpen,
  onClose,
  tweet,
  onTranslate,
  error
}: TranslationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Translation Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Original Text */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Original Tweet</h4>
            <p className="text-gray-900">{tweet.original_text}</p>
          </div>

          {/* Translation */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Translation</h4>
            {tweet.status === 'translating' ? (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>Translating...</span>
              </div>
            ) : tweet.translated_text ? (
              <p className="text-gray-900">{tweet.translated_text}</p>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-gray-500">No translation yet</p>
                <button
                  onClick={onTranslate}
                  className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-full text-sm font-medium transition-colors"
                >
                  Translate Now
                </button>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 