import { TweetV2, MediaObjectV2 } from 'twitter-api-v2';
import { TweetMedia, TweetStructureElement } from '@/types/tweet';

export function processTweet(tweet: TweetV2, mediaMap: Map<string, TweetMedia>) {
  // Process media attachments
  const tweetMedia = tweet.attachments?.media_keys?.map(key => mediaMap.get(key)).filter(Boolean) || [];
  
  // Create tweet structure (text and media sequence)
  const structure: TweetStructureElement[] = [];
  if (tweet.text) {
    // Split text by media placeholder and reconstruct with proper sequence
    const textParts = tweet.text.split('https://t.co/');
    textParts.forEach((part, index) => {
      if (part) structure.push({ type: 'text', content: part });
      if (index < tweetMedia.length) structure.push({ type: 'media', content: String(index) });
    });
  }

  // Determine thread information
  const threadId = tweet.conversation_id || tweet.id;
  const isPartOfThread = tweet.referenced_tweets?.some(ref => 
    ref.type === 'replied_to' && ref.id === threadId
  );

  return {
    tweet_structure: structure,
    media_attachments: tweetMedia,
    thread_id: isPartOfThread ? threadId : null,
    thread_position: null  // Will be updated after insertion
  };
}

export function createMediaMap(media: MediaObjectV2[]): Map<string, TweetMedia> {
  const mediaMap = new Map<string, TweetMedia>();
  
  media.forEach(media => {
    mediaMap.set(media.media_key, {
      type: media.type,
      url: media.url || media.preview_image_url || '',
      preview_url: media.preview_image_url,
      alt_text: media.alt_text
    });
  });

  return mediaMap;
} 