import React from 'react';

interface TranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalText: string;
  translatedText?: string;
  isLoading?: boolean;
}

export function TranslationModal({
  isOpen,
  onClose,
  originalText,
  translatedText,
  isLoading = false,
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
            <p className="text-gray-900">{originalText}</p>
          </div>

          {/* Translation */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Translation</h4>
            {isLoading ? (
              <div className="flex items-center space-x-2 text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>Translating...</span>
              </div>
            ) : translatedText ? (
              <p className="text-gray-900">{translatedText}</p>
            ) : (
              <p className="text-gray-500">No translation available</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 