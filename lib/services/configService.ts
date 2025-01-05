import { TwitterApi, TweetV2 } from 'twitter-api-v2';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateUUID } from '@/lib/utils';
import { processTweet, createMediaMap } from '@/lib/services/tweetProcessor';

interface Tweet {
  id: string;
  text: string;
  created_at?: string;
  edit_history_tweet_ids?: string[];
}

export interface ConfigData {
  sourceAccount: string;
  checkInterval: number;
  targetLanguage: string;
}

interface TransformedTweet {
  user_id: string;
  source_tweet_id: string;
  original_text: string;
  translated_text: string | null;
  image_urls: string[];
  status: 'pending' | 'translating' | 'translated' | 'posted';
  created_at: string;
  updated_at: string;
  author_name: string;
  author_username: string;
  author_profile_image: string;
  error_message: string | null;
  posted_tweet_id: string | null;
}

interface RateLimitInfo {
  reset: number;
  remaining: number;
  endpoint: string;
}

interface TwitterResponse {
  data: any;
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

async function checkAndUpdateRateLimit(userId: string): Promise<RateLimitInfo | null> {
  try {
    const { data: rateLimit } = await supabaseAdmin
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .single();

    console.log('Current rate limit info:', rateLimit);

    if (!rateLimit) return null;

    if (rateLimit.reset <= Date.now()) {
      console.log('Rate limit reset time passed, clearing limit');
      await supabaseAdmin
        .from('rate_limits')
        .delete()
        .eq('user_id', userId);
      return null;
    }

    if (rateLimit.remaining > 0) return rateLimit;

    if (rateLimit.remaining <= 0 && rateLimit.reset > Date.now()) {
      const waitMinutes = Math.ceil((rateLimit.reset - Date.now()) / (1000 * 60));
      console.log('Rate limit details:', {
        reset: new Date(rateLimit.reset),
        remaining: rateLimit.remaining,
        waitMinutes,
        endpoint: rateLimit.endpoint
      });
      throw new Error(`Rate limit exceeded for ${rateLimit.endpoint}. Please try again in ${waitMinutes} minutes.`);
    }

    return null;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit exceeded')) {
      throw error;
    }
    console.error('Error checking rate limit:', error);
    return null;
  }
}

async function updateRateLimit(userId: string, rateLimitData: any, endpoint: string) {
  const resetTime = Number(rateLimitData.reset) * 1000;
  const remaining = Number(rateLimitData.remaining);
  const limit = Number(rateLimitData.limit || 180);

  console.log('Updating rate limit:', {
    endpoint,
    resetTime: new Date(resetTime),
    remaining,
    limit,
    rateLimitData
  });

  await supabaseAdmin
    .from('rate_limits')
    .upsert({
      user_id: userId,
      reset: resetTime,
      remaining,
      limit,
      endpoint,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id',
      ignoreDuplicates: false
    });

  if (remaining <= 0 && resetTime > Date.now()) {
    return {
      reset: resetTime,
      remaining,
      endpoint
    };
  }

  return null;
}

export async function saveConfiguration(userId: string, config: ConfigData) {
  try {
    if (!userId || !config.sourceAccount || !config.checkInterval || !config.targetLanguage) {
      throw new Error('Missing required configuration fields');
    }

    const userUUID = generateUUID(userId);
    const now = new Date().toISOString();
    
    const { data: existingConfig } = await supabaseAdmin
      .from('config')
      .select('*')
      .eq('user_id', userUUID)
      .single();

    const cleanUsername = config.sourceAccount.replace(/^@+/, '');
    const sourceAccount = `@${cleanUsername}`;

    const configData = {
      user_id: userUUID,
      source_account: sourceAccount,
      check_interval: config.checkInterval,
      target_language: config.targetLanguage,
      updated_at: now
    };

    console.log('Saving configuration:', configData);

    const { error: upsertError } = existingConfig
      ? await supabaseAdmin
          .from('config')
          .update(configData)
          .eq('user_id', userUUID)
      : await supabaseAdmin
          .from('config')
          .insert([configData]);

    if (upsertError) {
      console.error('Config error:', upsertError);
      throw new Error(`Failed to save configuration: ${upsertError.message}`);
    }

    return { 
      success: true,
      message: 'Configuration saved successfully.'
    };
  } catch (error) {
    console.error('Error in saveConfiguration:', error);
    throw error;
  }
}

export async function fetchTweetsManually(userId: string, pagination_token?: string) {
  try {
    const userUUID = generateUUID(userId);
    
    const currentLimit = await checkAndUpdateRateLimit(userUUID);
    console.log('Current rate limit check result:', currentLimit);

    const { data: config, error: configError } = await supabaseAdmin
      .from('config')
      .select('source_account')
      .eq('user_id', userUUID)
      .single();

    if (configError || !config) {
      throw new Error('Configuration not found. Please save configuration first.');
    }

    const username = config.source_account.replace(/^@+/, '');
    
    const result = await fetchTweetsInBackground(userUUID, username, pagination_token);
    return result;
  } catch (error) {
    console.error('Error in fetchTweetsManually:', error);
    throw error;
  }
}

async function fetchTweetsInBackground(userId: string, username: string, pagination_token?: string) {
  try {
    const { data: twitterKeys, error: twitterError } = await supabaseAdmin
      .from('twitter_keys')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (twitterError || !twitterKeys) {
      console.error('Twitter keys error:', twitterError);
      throw new Error('Twitter credentials not found');
    }

    const twitterClient = new TwitterApi({
      appKey: twitterKeys.api_key,
      appSecret: twitterKeys.api_secret,
      accessToken: twitterKeys.access_token,
      accessSecret: twitterKeys.access_token_secret,
    });

    console.log('Fetching tweets for:', username);

    try {
      const { data: config } = await supabaseAdmin
        .from('config')
        .select('twitter_user_id, last_tweet_id')
        .eq('user_id', userId)
        .single();

      const { data: existingTweets } = await supabaseAdmin
        .from('tweets')
        .select('source_tweet_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      let twitterUserId = config?.twitter_user_id;

      if (!twitterUserId) {
        try {
          const user = await twitterClient.v2.userByUsername(username) as TwitterResponse;
          if (!user.data) {
            throw new Error(`User @${username} not found`);
          }
          twitterUserId = user.data.id;

          await supabaseAdmin
            .from('config')
            .update({ twitter_user_id: twitterUserId })
            .eq('user_id', userId);

          if (user.rateLimit) {
            await updateRateLimit(userId, user.rateLimit, 'userByUsername');
          }
        } catch (error: any) {
          if (error.code === 429) {
            if (error.rateLimit) {
              await updateRateLimit(userId, error.rateLimit, 'userByUsername');
            }
            throw new Error('Rate limit exceeded. Please wait a few minutes before trying again.');
          }
          throw error;
        }
      }

      const tweetResponse = await twitterClient.v2.userTimeline(twitterUserId, {
        max_results: 20,
        ...(pagination_token ? { pagination_token } : {}),
        ...(config?.last_tweet_id && !pagination_token ? { since_id: config.last_tweet_id } : {}),
        'tweet.fields': [
          'created_at',
          'attachments',
          'conversation_id',
          'in_reply_to_user_id',
          'referenced_tweets',
          'author_id',
          'text',
          'entities',
          'edit_history_tweet_ids',
          'note_tweet'
        ],
        'user.fields': ['profile_image_url', 'name', 'username'],
        'media.fields': ['url', 'preview_image_url', 'type', 'alt_text'],
        expansions: [
          'attachments.media_keys',
          'author_id',
          'referenced_tweets.id',
          'in_reply_to_user_id',
          'edit_history_tweet_ids'
        ],
        exclude: ['retweets', 'replies']
      });

      if (tweetResponse.rateLimit) {
        await updateRateLimit(userId, tweetResponse.rateLimit, 'userTimeline');
      }

      const tweets = tweetResponse.data.data || [];
      console.log(`Fetched ${tweets.length} tweets`);

      if (tweets.length === 0) {
        return {
          success: true,
          message: 'No new tweets found'
        };
      }

      // Filter out replies that aren't part of a thread by the same author
      const filteredTweets = tweets.filter((tweet: TweetV2) => {
        // If no referenced tweets, it's an original tweet
        if (!tweet.referenced_tweets) return true;
        
        // Check if it's part of a thread by the same author
        const isThread = tweet.referenced_tweets.some((ref) => 
          ref.type === 'replied_to' && 
          tweetResponse.data.includes?.tweets?.find((t) => 
            t.id === ref.id && 
            t.author_id === tweet.author_id
          )
        );

        // Keep if it's a quote tweet or part of a thread by same author
        return isThread || tweet.referenced_tweets.some((ref) => ref.type === 'quoted');
      });

      const tweetIds = filteredTweets.map((tweet) => tweet.id);
      const { data: existingTweetIds } = await supabaseAdmin
        .from('tweets')
        .select('source_tweet_id')
        .eq('user_id', userId)
        .in('source_tweet_id', tweetIds);

      const existingIds = new Set(existingTweetIds?.map(t => t.source_tweet_id) || []);
      const newTweets = filteredTweets.filter((tweet: Tweet) => !existingIds.has(tweet.id));

      console.log(`Found ${newTweets.length} new tweets after filtering duplicates`);

      if (newTweets.length === 0) {
        return {
          success: true,
          message: 'All tweets already exist in the database'
        };
      }

      const mediaMap = tweetResponse.data.includes?.media ? createMediaMap(tweetResponse.data.includes.media) : new Map();

      const transformedTweets = newTweets.map((tweet: Tweet) => {
        const processedTweet = processTweet(tweet as TweetV2, mediaMap);
        
        const baseTweet = {
          user_id: userId,
          source_tweet_id: tweet.id,
          original_text: tweet.text,
          author_username: username,
          author_profile_image: '',
          status: 'pending',
          translated_text: null,
          created_at: tweet.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        return {
          ...baseTweet,
          ...processedTweet
        };
      });

      if (transformedTweets.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('tweets')
          .insert(transformedTweets);

        if (insertError) {
          console.error('Insert error:', insertError);
          throw new Error(`Failed to store tweets: ${insertError.message}`);
        }

        await supabaseAdmin
          .from('config')
          .update({ 
            last_tweet_id: transformedTweets[0].source_tweet_id,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        return {
          success: true,
          message: `Successfully fetched ${transformedTweets.length} new tweets`,
          pagination_token: tweetResponse.data.meta?.next_token
        };
      }

      return {
        success: true,
        message: 'No new tweets to store'
      };

    } catch (error: any) {
      if (error.code === 429) {
        if (error.rateLimit) {
          await updateRateLimit(userId, error.rateLimit, 'userTimeline');
        }
        const resetTime = new Date(Number(error.rateLimit?.reset) * 1000);
        const waitMinutes = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60));
        
        const errorMessage = `Rate limit exceeded. Please try again in ${waitMinutes} minutes.`;
        console.error(errorMessage);
        
        await supabaseAdmin
          .from('config')
          .update({ 
            error_message: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);
          
        throw new Error(errorMessage);
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in fetchTweetsInBackground:', error);
    throw error;
  }
} 