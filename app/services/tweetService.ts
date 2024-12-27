import { supabaseAdmin } from '../../lib/supabase-admin';
import { Tweet } from '../../types/tweet';
import { TwitterApi } from 'twitter-api-v2';

export class TweetService {
  private twitterClient: TwitterApi;

  constructor(bearerToken: string) {
    this.twitterClient = new TwitterApi(bearerToken);
  }

  async fetchLatestTweets(userId: string, sinceId?: string): Promise<Tweet[]> {
    try {
      const params: any = {
        max_results: 10,
        'tweet.fields': 'created_at',
        'user.fields': 'profile_image_url',
        exclude: 'retweets,replies'
      };

      if (sinceId) {
        params.since_id = sinceId;
      }

      const tweets = await this.twitterClient.v2.userTimeline(userId, params);
      const formattedTweets: Tweet[] = [];

      for (const tweet of tweets.data.data || []) {
        const user = tweets.includes?.users?.[0];
        
        const formattedTweet: Tweet = {
          id: tweet.id,
          content: tweet.text,
          original_text: tweet.text,
          status: 'pending',
          posted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_at: tweet.created_at || new Date().toISOString(),
          source_tweet_id: tweet.id,
          author: user ? {
            name: user.name || '',
            username: user.username || '',
            profile_image_url: user.profile_image_url || ''
          } : undefined
        };

        // Check if tweet already exists in database
        const { data: existingTweet } = await supabaseAdmin
          .from('tweets')
          .select()
          .eq('source_tweet_id', tweet.id)
          .single();

        if (!existingTweet) {
          const { data: newTweet, error } = await supabaseAdmin
            .from('tweets')
            .insert({
              ...formattedTweet,
              source_tweet_id: tweet.id,
            })
            .select()
            .single();

          if (error) {
            console.error('Error inserting tweet:', error);
            continue;
          }

          if (newTweet) {
            formattedTweets.push(formattedTweet);
          }
        }
      }

      return formattedTweets;
    } catch (error) {
      console.error('Error fetching tweets:', error);
      throw error;
    }
  }

  async updateTweetStatus(tweetId: string, status: Tweet['status'], error?: string): Promise<void> {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (error) {
        updateData.error_message = error;
      }

      if (status === 'posted') {
        updateData.posted_at = new Date().toISOString();
      }

      const { error: updateError } = await supabaseAdmin
        .from('tweets')
        .update(updateData)
        .eq('source_tweet_id', tweetId);

      if (updateError) {
        console.error('Error updating tweet status:', updateError);
        throw updateError;
      }
    } catch (error) {
      console.error('Error updating tweet status:', error);
      throw error;
    }
  }

  async getTweets(): Promise<Tweet[]> {
    try {
      const { data: tweets, error } = await supabaseAdmin
        .from('tweets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching tweets:', error);
        throw error;
      }

      return tweets as Tweet[];
    } catch (error) {
      console.error('Error fetching tweets:', error);
      throw error;
    }
  }

  async deleteTweet(tweetId: string): Promise<void> {
    try {
      const { error } = await supabaseAdmin
        .from('tweets')
        .delete()
        .eq('source_tweet_id', tweetId);

      if (error) {
        console.error('Error deleting tweet:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting tweet:', error);
      throw error;
    }
  }
} 