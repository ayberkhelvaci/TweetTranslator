import { TweetMedia } from '@/types/tweet';
import { TwitterApiError } from '@/types/twitter';

/**
 * Formats tweet text to include media references
 */
export function formatTweetText(text: string, mediaAttachments?: TweetMedia[], sourceTweetId?: string): string {
  let formattedText = text;

  // Add media reference if needed
  if (mediaAttachments && mediaAttachments.length > 0 && sourceTweetId) {
    const mediaCount = mediaAttachments.length;
    const mediaType = mediaCount === 1 ? 'media' : 'media items';
    formattedText += `\n\n📸 View ${mediaCount} ${mediaType}: https://twitter.com/i/status/${sourceTweetId}`;
  }

  return formattedText;
}

/**
 * Handles Twitter API errors and returns appropriate error messages
 */
export function handleTwitterError(error: TwitterApiError): {
  message: string;
  status: 'failed' | 'queued';
  resetTime?: string;
} {
  if (error.code === 429) {
    const resetTime = new Date(Number(error.rateLimit?.reset) * 1000);
    const waitMinutes = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60));
    return {
      message: `Rate limit exceeded. Please try again in ${waitMinutes} minutes.`,
      status: 'queued',
      resetTime: resetTime.toISOString()
    };
  }

  if (error.code === 403) {
    return {
      message: 'API permission error. Please check your API access level.',
      status: 'failed'
    };
  }

  return {
    message: error.errors?.[0]?.message || error.message || 'Failed to post tweet',
    status: 'failed'
  };
} 