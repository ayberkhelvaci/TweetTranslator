import { Tweet } from '@/types/tweet';

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  author?: {
    name: string;
    username: string;
    profile_image_url: string;
  };
  media_attachments: Array<{
    type: 'photo' | 'video' | 'animated_gif';
    url: string;
    preview_image_url?: string;
    alt_text?: string;
  }>;
  conversation_id: string;
  referenced_tweets?: Array<{
    type: 'replied_to' | 'retweeted' | 'quoted';
    id: string;
  }>;
}

export function processTweet(tweet: TwitterTweet): Partial<Tweet> {
  // Process thread information
  const isPartOfThread = tweet.referenced_tweets?.some(
    (ref: { type: string; id: string }) => ref.type === 'replied_to'
  );
  const isThreadStart = !tweet.referenced_tweets?.some(
    (ref: { type: string; id: string }) => ref.type === 'replied_to'
  );
  const threadId = isPartOfThread ? tweet.conversation_id : undefined;

  return {
    source_tweet_id: tweet.id,
    original_text: tweet.text,
    created_at: tweet.created_at,
    status: 'pending',
    author: tweet.author ? {
      name: tweet.author.name,
      username: tweet.author.username,
      profile_image_url: tweet.author.profile_image_url
    } : undefined,
    media_attachments: tweet.media_attachments,
    thread_id: threadId,
    is_thread_start: isThreadStart,
    conversation_id: tweet.conversation_id
  };
} 