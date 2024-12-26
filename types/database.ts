export interface User {
  id: string;
  email?: string;
  name?: string;
  image?: string;
  twitter_username: string | null;
  twitter_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires: string;
  session_token: string;
}

export interface Account {
  id: string;
  user_id: string;
  type: string;
  provider: string;
  provider_account_id: string;
  refresh_token?: string;
  access_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  id_token?: string;
  session_state?: string;
}

export interface Tweet {
  id: string;
  user_id: string;
  source_tweet_id: string;
  original_text: string;
  translated_text?: string;
  image_urls: string[];
  status: 'pending' | 'translated' | 'published' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface Config {
  id: string;
  user_id: string;
  source_account: string;
  target_language: string;
  check_interval: number;
  updated_at: string;
}

export interface TranslationOrder {
  id: string;
  user_id: string;
  source_account: string;
  target_language: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  tweets_count: number;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          twitter_username: string | null;
          twitter_id: string | null;
          name: string | null;
          email: string;
          image: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          twitter_username?: string | null;
          twitter_id?: string | null;
          name?: string | null;
          email: string;
          image?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          twitter_username?: string | null;
          twitter_id?: string | null;
          name?: string | null;
          email?: string;
          image?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tweets: {
        Row: {
          id: string;
          user_id: string;
          source_tweet_id: string;
          original_text: string;
          translated_text: string | null;
          image_urls: string[];
          status: 'pending' | 'translated' | 'published' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source_tweet_id: string;
          original_text: string;
          translated_text?: string | null;
          image_urls?: string[];
          status?: 'pending' | 'translated' | 'published' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source_tweet_id?: string;
          original_text?: string;
          translated_text?: string | null;
          image_urls?: string[];
          status?: 'pending' | 'translated' | 'published' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
      };
      config: {
        Row: {
          id: string;
          source_account: string;
          target_language: string;
          check_interval: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          source_account: string;
          target_language: string;
          check_interval?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          source_account?: string;
          target_language?: string;
          check_interval?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
} 