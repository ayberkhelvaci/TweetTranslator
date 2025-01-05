import { TweetV2, MediaObjectV2 } from 'twitter-api-v2';
import { TweetMedia } from '@/types/tweet';

export function processTweet(tweet: TweetV2, mediaMap: Map<string, TweetMedia>) {
  // Process media attachments
  const tweetMedia = tweet.attachments?.media_keys?.map(key => mediaMap.get(key)).filter(Boolean) || [];
  
  // Determine thread information
  const threadId = tweet.conversation_id || tweet.id;
  const isPartOfThread = tweet.referenced_tweets?.some(ref => 
    ref.type === 'replied_to' && ref.id === threadId
  );

  return {
    media_attachments: tweetMedia,
    thread_id: isPartOfThread ? threadId : undefined,
    thread_position: undefined,  // Will be updated after insertion
    is_thread_start: isPartOfThread ? false : true,
    is_thread_end: true  // Will be updated when next tweet in thread is found
  };
}

export function createMediaMap(media: MediaObjectV2[]): Map<string, TweetMedia> {
  const mediaMap = new Map<string, TweetMedia>();
  
  media.forEach(media => {
    mediaMap.set(media.media_key, {
      type: media.type as 'photo' | 'video' | 'animated_gif',
      url: media.url || media.preview_image_url || '',
      preview_image_url: media.preview_image_url,
      alt_text: media.alt_text
    });
  });

  return mediaMap;
} 