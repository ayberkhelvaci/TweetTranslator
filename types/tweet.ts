export interface TweetMedia {
  type: 'photo' | 'video' | 'animated_gif';
  url: string;
  preview_url?: string;
  alt_text?: string;
}

export interface TweetStructureElement {
  type: 'text' | 'media';
  content: string;  // For text: the actual text, for media: the media index in media_attachments
}

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
  
  // New fields for media and thread handling
  tweet_structure?: TweetStructureElement[];  // Sequence of text and media in the tweet
  media_attachments?: TweetMedia[];          // Details of media attachments
  thread_id?: string;                        // ID of the thread this tweet belongs to
  thread_position?: number;                  // Position in the thread (0 for first tweet)
} 