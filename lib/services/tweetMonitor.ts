import { supabaseAdmin } from '@/lib/supabase-admin';
import { TwitterApi } from 'twitter-api-v2';

// Cache for user IDs to reduce API calls
const userIdCache: { [username: string]: string } = {};
const USER_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
let lastUserFetch: { [username: string]: number } = {};

export type TweetStatus = 'pending' | 'translating' | 'translated' | 'posted' | 'failed';

export interface TransformedTweet {
  user_id: string;
  source_tweet_id: string;
  original_text: string;
  translated_text?: string;
  image_urls: string[];
  status: TweetStatus;
  created_at: string;
  updated_at: string;
  author_name: string;
  author_username: string;
  author_profile_image: string;
  error_message?: string;
}

async function getUserId(client: TwitterApi, username: string): Promise<string> {
  const now = Date.now();
  
  // Check if we have a cached user ID that's not expired
  if (
    userIdCache[username] && 
    lastUserFetch[username] && 
    (now - lastUserFetch[username]) < USER_CACHE_DURATION
  ) {
    return userIdCache[username];
  }

  const user = await client.v2.userByUsername(username);
  if (!user?.data?.id) {
    throw new Error(`User @${username} not found`);
  }

  // Cache the user ID
  userIdCache[username] = user.data.id;
  lastUserFetch[username] = now;
  
  return user.data.id;
}

function checkRateLimit(headers: any): boolean {
  // Check 24-hour limit
  const dailyLimit = headers['x-user-limit-24hour-limit'];
  const dailyRemaining = headers['x-user-limit-24hour-remaining'];
  
  // If we have more than 10% of daily limit remaining, continue
  if (dailyLimit && dailyRemaining && dailyRemaining > (dailyLimit * 0.1)) {
    return true;
  }

  // Check immediate rate limit
  const limit = headers['x-rate-limit-limit'];
  const remaining = headers['x-rate-limit-remaining'];
  
  // If we have more than 1 request remaining, continue
  if (limit && remaining && remaining > 1) {
    return true;
  }

  return false;
}

function formatRateLimitMessage(headers: any): string {
  // Check 24-hour limit first
  const dailyLimit = headers['x-user-limit-24hour-limit'];
  const dailyRemaining = headers['x-user-limit-24hour-remaining'];
  const dailyReset = headers['x-user-limit-24hour-reset'];

  if (dailyLimit && dailyRemaining !== undefined && dailyReset) {
    const resetDate = new Date(Number(dailyReset) * 1000);
    const hoursUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60 * 60));
    
    return `Rate limit reached: ${dailyRemaining} requests remaining out of ${dailyLimit}. Resets in ${hoursUntilReset} hours.`;
  }

  // Fallback to immediate rate limit
  const limit = headers['x-rate-limit-limit'];
  const remaining = headers['x-rate-limit-remaining'];
  const reset = headers['x-rate-limit-reset'];

  if (limit && remaining !== undefined && reset) {
    const resetDate = new Date(Number(reset) * 1000);
    const minutesUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / (1000 * 60));
    
    return `Rate limited: ${remaining} requests remaining out of ${limit}. Resets in ${minutesUntilReset} minutes.`;
  }

  return 'Rate limited. Please try again later.';
}

export async function checkLatestTweet(userId: string) {
  try {
    // Get Twitter API keys for the user
    const { data: keys, error: keysError } = await supabaseAdmin
      .from('twitter_keys')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (keysError || !keys) {
      throw new Error('Twitter API keys not found');
    }

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: keys.api_key,
      appSecret: keys.api_secret,
      accessToken: keys.access_token,
      accessSecret: keys.access_token_secret,
    });

    // Get user configuration
    const { data: config, error: configError } = await supabaseAdmin
      .from('config')
      .select('source_account, last_check_time')
      .single();

    if (configError || !config?.source_account) {
      throw new Error('Source account not configured');
    }

    // Clean up username
    const username = config.source_account.replace('@', '');
    console.log(`Fetching tweets for @${username}`);

    // Get the most recent tweet we have for this user
    const { data: lastTweet } = await supabaseAdmin
      .from('tweets')
      .select('source_tweet_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Determine if this is an initial fetch or a periodic check
    const isInitialFetch = !lastTweet;
    const now = new Date();
    const lastCheckTime = config.last_check_time ? new Date(config.last_check_time) : null;
    const sixHoursAgo = new Date(now.getTime() - (6 * 60 * 60 * 1000));

    // Skip check if it's not initial and we've checked recently
    if (!isInitialFetch && lastCheckTime && lastCheckTime > sixHoursAgo) {
      console.log('Skipping check - last check was less than 6 hours ago');
      return [];
    }

    try {
      // Get user ID (cached if possible)
      const targetUserId = await getUserId(client, username);
      console.log(`Found user ID: ${targetUserId}`);

      // Fetch tweets with media fields
      const tweetResponse = await client.v2.userTimeline(targetUserId, {
        max_results: isInitialFetch ? 20 : 5, // Get more tweets on initial fetch
        start_time: lastTweet ? new Date(lastTweet.created_at).toISOString() : undefined,
        'tweet.fields': ['created_at', 'attachments', 'author_id'],
        'user.fields': ['profile_image_url', 'name', 'username'],
        'media.fields': ['url', 'preview_image_url', 'type'],
        expansions: ['attachments.media_keys', 'author_id'],
        exclude: ['retweets', 'replies'], // Exclude retweets and replies at API level
      });

      console.log(`Raw tweet response:`, JSON.stringify(tweetResponse, null, 2));

      const tweets = await tweetResponse.fetchLast(isInitialFetch ? 20 : 5);
      console.log(`Fetched ${tweets.length} tweets`);

      const transformedTweets: TransformedTweet[] = [];
      
      for (const tweet of tweets) {
        console.log(`Processing tweet:`, JSON.stringify(tweet, null, 2));
        
        // Skip mentions
        if (tweet.text.startsWith('@')) {
          console.log('Skipping mention tweet');
          continue;
        }

        const media = tweetResponse.includes?.media || [];
        const author = tweetResponse.includes?.users?.find(u => u.id === tweet.author_id);
        console.log(`Found ${media.length} media items`);
        
        // Check if tweet already exists
        const { data: existingTweet } = await supabaseAdmin
          .from('tweets')
          .select('id')
          .eq('source_tweet_id', tweet.id)
          .eq('user_id', userId)
          .single();

        if (!existingTweet) {
          const tweetMedia = media
            .filter(m => m.type === 'photo' && tweet.attachments?.media_keys?.includes(m.media_key))
            .map(m => m.url || m.preview_image_url)
            .filter((url): url is string => !!url);

          console.log(`Found ${tweetMedia.length} images for tweet`);

          transformedTweets.push({
            user_id: userId,
            source_tweet_id: tweet.id,
            original_text: tweet.text,
            image_urls: tweetMedia,
            status: 'pending',
            created_at: tweet.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            author_name: author?.name || username,
            author_username: author?.username || username,
            author_profile_image: author?.profile_image_url || '',
          });
        }
      }

      // Sort tweets by creation date in descending order (newest first)
      transformedTweets.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      if (transformedTweets.length > 0) {
        // Store new tweets in database
        const { error: insertError } = await supabaseAdmin
          .from('tweets')
          .insert(transformedTweets);

        if (insertError) {
          throw new Error(`Failed to store tweets: ${insertError.message}`);
        }

        console.log(`Successfully stored ${transformedTweets.length} new tweets`);
      } else {
        console.log('No new tweets found');
      }

      // Update last check time
      await supabaseAdmin
        .from('config')
        .update({ last_check_time: now.toISOString() })
        .eq('id', config.id);

      return transformedTweets;

    } catch (error: any) {
      if (error?.code === 429) { // Rate limit error
        const message = formatRateLimitMessage(error.headers);
        console.log(message);
        
        // Only throw if we're actually running low on requests
        if (!checkRateLimit(error.headers)) {
          throw new Error(message);
        }
        
        // Otherwise, continue with empty result
        console.log('Rate limit warning, but continuing with available requests');
        return [];
      }
      throw error;
    }

  } catch (error) {
    console.error('Error in checkLatestTweet:', error);
    throw error;
  }
} 