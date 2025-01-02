import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TwitterApi, TweetV2 } from 'twitter-api-v2';

export async function POST(req: Request) {
  const jobId = new Date().toISOString();
  console.log(`[Auto-Fetch Job ${jobId}] Starting...`);
  
  try {
    // Verify the secret token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    
    if (!token || token !== process.env.CRON_SECRET) {
      console.log(`[Auto-Fetch Job ${jobId}] Auth failed. Received token:`, token?.slice(0, 10));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`[Auto-Fetch Job ${jobId}] Fetching configurations...`);
    // Get all active configurations with auto_mode enabled
    const { data: configs, error: configError } = await supabaseAdmin
      .from('config')
      .select('*, twitter_keys(*)')
      .not('registration_timestamp', 'is', null)
      .eq('auto_mode', true);

    console.log(`[Auto-Fetch Job ${jobId}] Found ${configs?.length ?? 0} active configurations`);
    if (configs && configs.length > 0) {
      console.log(`[Auto-Fetch Job ${jobId}] Config details:`, configs.map(c => ({
        source_account: c.source_account,
        has_keys: !!c.twitter_keys,
        registration_time: c.registration_timestamp
      })));
    }

    if (configError) {
      console.error(`[Auto-Fetch Job ${jobId}] Config error:`, configError);
      throw new Error('Failed to fetch configurations');
    }

    const results = [];

    // Process each configuration
    for (const config of configs || []) {
      try {
        console.log(`[Auto-Fetch Job ${jobId}] Processing account: ${config.source_account}`);
        
        if (!config.twitter_keys) {
          console.log(`[Auto-Fetch Job ${jobId}] No Twitter keys found for ${config.source_account}`);
          continue;
        }

        // Add delay between requests to avoid rate limits
        if (results.length > 0) {
          console.log(`[Auto-Fetch Job ${jobId}] Waiting 2 seconds before next request...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Initialize Twitter client
        const client = new TwitterApi({
          appKey: config.twitter_keys.api_key,
          appSecret: config.twitter_keys.api_secret,
          accessToken: config.twitter_keys.access_token,
          accessSecret: config.twitter_keys.access_token_secret,
        });

        console.log(`[Auto-Fetch Job ${jobId}] Fetching tweets for ${config.source_account} since: ${config.registration_timestamp}`);
        try {
          // Get user ID first
          const username = config.source_account.replace('@', '');
          const user = await client.v2.userByUsername(username);
          
          if (!user.data) {
            throw new Error(`User ${config.source_account} not found`);
          }

          // Get tweets since registration
          const tweets = await client.v2.userTimeline(user.data.id, {
            'tweet.fields': ['created_at', 'attachments'],
            'user.fields': ['profile_image_url', 'name', 'username'],
            'media.fields': ['url', 'preview_image_url', 'type'],
            expansions: ['attachments.media_keys', 'author_id'],
            max_results: 10,
            exclude: ['retweets', 'replies'],
            ...(config.last_tweet_id ? { since_id: config.last_tweet_id } : {})
          });

          // Process tweets
          if (tweets.data?.data && tweets.data.data.length > 0) {
            console.log(`[Auto-Fetch Job ${jobId}] Found ${tweets.data.data.length} new tweets for ${config.source_account}`);
            
            // Filter out tweets without created_at
            const validTweets = tweets.data.data.filter((tweet: TweetV2) => tweet.created_at);
            console.log(`[Auto-Fetch Job ${jobId}] ${validTweets.length} tweets have valid timestamps`);

            if (validTweets.length === 0) {
              console.warn(`[Auto-Fetch Job ${jobId}] No tweets with valid created_at timestamp found`);
              continue;
            }

            // Check for existing tweets
            const tweetIds = validTweets.map(tweet => tweet.id);
            const { data: existingTweets } = await supabaseAdmin
              .from('tweets')
              .select('tweet_id')
              .eq('user_id', config.user_id)
              .in('tweet_id', tweetIds);

            const existingTweetIds = new Set(existingTweets?.map(t => t.tweet_id) || []);
            const newTweets = validTweets.filter(tweet => !existingTweetIds.has(tweet.id));

            console.log(`[Auto-Fetch Job ${jobId}] Found ${newTweets.length} new tweets after filtering duplicates`);

            if (newTweets.length === 0) {
              console.log(`[Auto-Fetch Job ${jobId}] All tweets already exist for ${config.source_account}`);
              continue;
            }

            // Insert new tweets
            const { error: insertError } = await supabaseAdmin.from('tweets').insert(
              newTweets.map((tweet: TweetV2) => ({
                user_id: config.user_id,
                source_tweet_id: tweet.id,
                original_text: tweet.text,
                translated_text: null,
                author_username: username,
                author_profile_image: '',
                status: 'pending_auto',
                created_at: tweet.created_at,
                updated_at: new Date().toISOString()
              }))
            );

            if (insertError) {
              console.error(`[Auto-Fetch Job ${jobId}] Error inserting tweets:`, insertError);
              continue;
            }

            // Update registration_timestamp to the latest tweet's timestamp
            const latestTweet = validTweets.reduce((latest: TweetV2, current: TweetV2) => {
              return new Date(current.created_at!) > new Date(latest.created_at!) ? current : latest;
            });

            console.log(`[Auto-Fetch Job ${jobId}] Updating last_tweet_id to: ${latestTweet.id}`);
            const { error: updateError } = await supabaseAdmin
              .from('config')
              .update({
                last_tweet_id: latestTweet.id,
                updated_at: new Date().toISOString(),
              })
              .eq('user_id', config.user_id);

            if (updateError) {
              console.error(`[Auto-Fetch Job ${jobId}] Error updating last_tweet_id:`, updateError);
            }

            results.push({
              source_account: config.source_account,
              tweets_fetched: validTweets.length,
            });
          } else {
            console.log(`[Auto-Fetch Job ${jobId}] No new tweets found for ${config.source_account}`);
            results.push({
              source_account: config.source_account,
              tweets_fetched: 0,
            });
          }
        } catch (twitterError: any) {
          if (twitterError?.code === 429) {
            console.log(`[Auto-Fetch Job ${jobId}] Rate limit hit for ${config.source_account}, will retry in next cron run`);
            results.push({
              account: config.source_account,
              status: 'rate_limited',
              message: 'Rate limit exceeded, will retry later'
            });
          } else {
            throw twitterError;
          }
        }
      } catch (error) {
        console.error(`[Auto-Fetch Job ${jobId}] Error processing account:`, config.source_account, error);
        results.push({
          account: config.source_account,
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to fetch tweets'
        });
      }
    }

    console.log(`[Auto-Fetch Job ${jobId}] Completed with results:`, results);
    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error(`[Auto-Fetch Job ${jobId}] Auto fetch error:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 