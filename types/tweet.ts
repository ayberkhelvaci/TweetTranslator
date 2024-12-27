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
} 