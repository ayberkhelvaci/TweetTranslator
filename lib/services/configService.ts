import { supabaseAdmin } from '@/lib/supabase-admin';
import { TwitterApi } from 'twitter-api-v2';
import crypto from 'crypto';

// Function to generate a UUID from a string
function generateUUID(str: string): string {
  const hash = crypto.createHash('sha256').update(str).digest();
  const uuid = [
    hash.slice(0, 4).toString('hex'),
    hash.slice(4, 6).toString('hex'),
    hash.slice(6, 8).toString('hex'),
    hash.slice(8, 10).toString('hex'),
    hash.slice(10, 16).toString('hex'),
  ].join('-');
  return uuid;
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

interface TwitterUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
}

interface TwitterMedia {
  media_key: string;
  type: string;
  url?: string;
  preview_image_url?: string;
  alt_text?: string;
}

interface TwitterTweet {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  attachments?: {
    media_keys: string[];
  };
  conversation_id?: string;
  referenced_tweets?: Array<{
    type: 'replied_to' | 'retweeted' | 'quoted';
    id: string;
  }>;
  note_tweet?: {
    text: string;
  };
}

interface TwitterIncludes {
  media?: TwitterMedia[];
  tweets?: TwitterTweet[];
  users?: TwitterUser[];
}

interface TwitterResponse {
  data: {
    data: TwitterTweet[];
    includes?: TwitterIncludes;
  };
  rateLimit?: {
    limit: number;
    remaining: number;
    reset: number;
  };
}

interface TwitterUserResponse {
  data: {
    id: string;
    name: string;
    username: string;
  };
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

    // If no rate limit exists, allow the request
    if (!rateLimit) {
      return null;
    }

    // If we're past the reset time, clear the limit and allow the request
    if (rateLimit.reset <= Date.now()) {
      console.log('Rate limit reset time passed, clearing limit');
      await supabaseAdmin
        .from('rate_limits')
        .delete()
        .eq('user_id', userId);
      return null;
    }

    // If we still have remaining requests, allow them
    if (rateLimit.remaining > 0) {
      return rateLimit;
    }

    // Only if we have no remaining requests and haven't reached reset time
    // should we block with a rate limit error
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
  const resetTime = Number(rateLimitData.reset) * 1000; // Convert to milliseconds
  const remaining = Number(rateLimitData.remaining);
  const limit = Number(rateLimitData.limit || 180); // Default to 180 for Twitter API

  console.log('Updating rate limit:', {
    endpoint,
    resetTime: new Date(resetTime),
    remaining,
    limit,
    rateLimitData
  });

  // Always update rate limit info to track remaining requests
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

  // Only throw an error if we're actually rate limited
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
    
    // Get existing configuration
    const { data: existingConfig } = await supabaseAdmin
      .from('config')
      .select('*')
      .eq('user_id', userUUID)
      .single();

    // Clean up the source account: remove any existing @ and add just one
    const cleanUsername = config.sourceAccount.replace(/^@+/, ''); // Remove all @ from start
    const sourceAccount = `@${cleanUsername}`; // Add single @

    // Prepare configuration data
    const configData = {
      user_id: userUUID,
      source_account: sourceAccount,
      check_interval: config.checkInterval,
      target_language: config.targetLanguage,
      updated_at: now
    };

    console.log('Saving configuration:', configData);

    // If no existing config, insert new. If exists, update.
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

export async function fetchTweetsManually(userId: string) {
  try {
    const userUUID = generateUUID(userId);
    
    // Check rate limits first
    const currentLimit = await checkAndUpdateRateLimit(userUUID);
    console.log('Current rate limit check result:', currentLimit);

    // Get user's configuration
    const { data: config, error: configError } = await supabaseAdmin
      .from('config')
      .select('source_account')
      .eq('user_id', userUUID)
      .single();

    if (configError || !config) {
      throw new Error('Configuration not found. Please save configuration first.');
    }

    // Clean up username for API call
    const username = config.source_account.replace(/^@+/, '');
    
    // Fetch tweets
    const result = await fetchTweetsInBackground(userUUID, username);
    return result;
  } catch (error) {
    console.error('Error in fetchTweetsManually:', error);
    throw error;
  }
}

async function fetchTweetsInBackground(userId: string, username: string) {
  try {
    // Get Twitter credentials
    const { data: twitterKeys, error: twitterError } = await supabaseAdmin
      .from('twitter_keys')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (twitterError || !twitterKeys) {
      console.error('Twitter keys error:', twitterError);
      throw new Error('Twitter credentials not found');
    }

    // Initialize Twitter client
    const twitterClient = new TwitterApi({
      appKey: twitterKeys.api_key,
      appSecret: twitterKeys.api_secret,
      accessToken: twitterKeys.access_token,
      accessSecret: twitterKeys.access_token_secret,
    });

    console.log('Fetching tweets for:', username);

    try {
      // Get user's configuration with twitter_user_id and existing tweets
      const { data: config } = await supabaseAdmin
        .from('config')
        .select('twitter_user_id, last_tweet_id')
        .eq('user_id', userId)
        .single();

      // Check if we have any existing tweets
      const { data: existingTweets } = await supabaseAdmin
        .from('tweets')
        .select('source_tweet_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);

      let twitterUserId = config?.twitter_user_id;

      // If we don't have the Twitter user ID cached, get it
      if (!twitterUserId) {
        try {
          const user = await twitterClient.v2.userByUsername(username) as TwitterUserResponse;
          if (!user.data) {
            throw new Error(`User @${username} not found`);
          }
          twitterUserId = user.data.id;

          // Cache the Twitter user ID
          await supabaseAdmin
            .from('config')
            .update({ twitter_user_id: twitterUserId })
            .eq('user_id', userId);

          // Update rate limit info
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

      // Fetch tweets with minimal parameters to reduce rate limit impact
      const tweetResponse = await twitterClient.v2.userTimeline(twitterUserId, {
        max_results: existingTweets?.length ? 5 : 10,
        ...(config?.last_tweet_id ? { since_id: config.last_tweet_id } : {}),
        'tweet.fields': [
          'created_at',
          'attachments',
          'author_id',
          'conversation_id',
          'referenced_tweets',
          'entities',
          'note_tweet'
        ],
        'media.fields': [
          'type',
          'url',
          'preview_image_url',
          'alt_text',
          'media_key'
        ],
        'user.fields': [
          'id',
          'name',
          'username',
          'profile_image_url'
        ],
        expansions: [
          'attachments.media_keys',
          'author_id',
          'referenced_tweets.id',
          'referenced_tweets.id.author_id'
        ],
        exclude: ['replies', 'retweets']
      }) as TwitterResponse;

      // Update rate limit info
      if (tweetResponse.rateLimit) {
        await updateRateLimit(userId, tweetResponse.rateLimit, 'userTimeline');
      }

      const tweets = tweetResponse.data.data || [];
      const includes = tweetResponse.data.includes || {};
      console.log(`Fetched ${tweets.length} tweets`);

      if (tweets.length === 0) {
        return {
          success: true,
          message: 'No new tweets found'
        };
      }

      // Check for existing tweets
      const tweetIds = tweets.map((tweet: TwitterTweet) => tweet.id);
      const { data: existingTweetIds } = await supabaseAdmin
        .from('tweets')
        .select('source_tweet_id')
        .eq('user_id', userId)
        .in('source_tweet_id', tweetIds);

      const existingIds = new Set(existingTweetIds?.map(t => t.source_tweet_id) || []);
      const newTweets = tweets.filter((tweet: TwitterTweet) => !existingIds.has(tweet.id));

      console.log(`Found ${newTweets.length} new tweets after filtering duplicates`);

      if (newTweets.length === 0) {
        return {
          success: true,
          message: 'All tweets already exist in the database'
        };
      }

      // Transform tweets to match our schema
      const transformedTweets = newTweets.map((tweet: TwitterTweet) => {
        // Process media attachments
        const mediaKeys = tweet.attachments?.media_keys || [];
        const mediaAttachments = includes.media
          ?.filter(m => mediaKeys.includes(m.media_key))
          .map(m => ({
            type: m.type,
            url: m.url || m.preview_image_url,
            preview_image_url: m.preview_image_url,
            alt_text: m.alt_text
          })) || [];

        // Get thread information
        const isThread = tweet.referenced_tweets?.some(ref => ref.type === 'replied_to');
        const threadId = isThread ? tweet.conversation_id : null;
        const position = isThread ? tweet.referenced_tweets?.length : null;

        // Get author information
        const author = includes.users?.find(u => u.id === tweet.author_id);

        return {
          user_id: userId,
          source_tweet_id: tweet.id,
          original_text: tweet.text,
          translated_text: null,
          author_username: author?.username || username,
          author_profile_image: author?.profile_image_url || '',
          status: 'pending',
          created_at: tweet.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
          media_attachments: mediaAttachments,
          thread_id: threadId,
          thread_position: position,
          conversation_id: tweet.conversation_id,
          tweet_structure: {
            tweet,
            includes: {
              media: includes.media || [],
              referenced_tweets: includes.tweets || [],
              users: includes.users || []
            }
          }
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
          message: `Successfully fetched ${transformedTweets.length} new tweets`
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