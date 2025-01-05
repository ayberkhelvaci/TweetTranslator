export interface Tweet {
  id: string;
  content: string;
  original_text: string;
  translated_text?: string | null;
  status: 'pending' | 'translating' | 'translated' | 'posted' | 'failed' | 'queued';
  posted_at: string;
  updated_at: string;
  created_at: string;
  error_message?: string;
  author?: {
    name: string;
    username: string;
    profile_image_url: string;
  };
  source_tweet_id: string;
  retry_after?: string;
  image_urls?: string[];
  posted_tweet_id?: string;
  
  // Thread-related fields
  thread_id?: string;
  thread_position?: number;
  is_thread_start?: boolean;
  is_thread_end?: boolean;
  conversation_id?: string;
  
  // Media attachments
  media_attachments?: Array<TweetMedia | string>;
}

export interface TweetMedia {
  type: 'photo' | 'video' | 'animated_gif';
  url: string;
  preview_image_url?: string;
  alt_text?: string;
} 