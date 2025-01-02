import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TwitterApi, TweetV2 } from 'twitter-api-v2';

export async function POST(req: Request) {
  try {
    // Verify the secret token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    
    if (!token || token !== process.env.CRON_SECRET) {
      console.log('Auth failed. Received token:', token?.slice(0, 10));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Fetching configurations...');
    // Get all active configurations with auto_mode enabled
    const { data: configs, error: configError } = await supabaseAdmin
      .from('config')
      .select('*, twitter_keys(*)')
      .not('registration_timestamp', 'is', null)
      .eq('auto_mode', true);

    console.log('Found configs:', configs?.length ?? 0);
    if (configs && configs.length > 0) {
      console.log('Config details:', configs.map(c => ({
        source_account: c.source_account,
        has_keys: !!c.twitter_keys,
        registration_time: c.registration_timestamp
      })));
    }

    if (configError) {
      console.error('Config error details:', configError);
      throw new Error('Failed to fetch configurations');
    }

    const results = [];

    // Process each configuration
    for (const config of configs || []) {
      try {
        console.log(`Processing account: ${config.source_account}`);
        
        if (!config.twitter_keys) {
          console.log(`No Twitter keys found for ${config.source_account}`);
          continue;
        }

        // Initialize Twitter client
        const client = new TwitterApi({
          appKey: config.twitter_keys.api_key,
          appSecret: config.twitter_keys.api_secret,
          accessToken: config.twitter_keys.access_token,
          accessSecret: config.twitter_keys.access_token_secret,
        });

        console.log(`Fetching tweets since: ${config.registration_timestamp}`);
        // Get tweets since registration
        const tweets = await client.v2.userTimeline(config.source_account, {
          'tweet.fields': ['created_at', 'attachments'],
          'user.fields': ['profile_image_url', 'name', 'username'],
          'media.fields': ['url', 'preview_image_url', 'type'],
          expansions: ['attachments.media_keys', 'author_id'],
          start_time: config.registration_timestamp,
        });

        // Process tweets
        if (tweets.data?.data && tweets.data.data.length > 0) {
          // Filter out tweets without created_at
          const validTweets = tweets.data.data.filter((tweet: TweetV2) => tweet.created_at);

          if (validTweets.length === 0) {
            console.warn('No tweets with valid created_at timestamp found');
            continue;
          }

          // Insert new tweets
          const { error: insertError } = await supabaseAdmin.from('tweets').insert(
            validTweets.map((tweet: TweetV2) => ({
              tweet_id: tweet.id,
              user_id: config.user_id,
              source_tweet_id: tweet.id,
              source_text: tweet.text,
              created_at: tweet.created_at,
            }))
          );

          if (insertError) {
            console.error('Error inserting tweets:', insertError);
            continue;
          }

          // Update registration_timestamp to the latest tweet's timestamp
          const latestTweet = validTweets.reduce((latest: TweetV2, current: TweetV2) => {
            return new Date(current.created_at!) > new Date(latest.created_at!) ? current : latest;
          });

          const { error: updateError } = await supabaseAdmin
            .from('config')
            .update({
              registration_timestamp: latestTweet.created_at,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', config.user_id);

          if (updateError) {
            console.error('Error updating registration_timestamp:', updateError);
          }

          results.push({
            source_account: config.source_account,
            tweets_fetched: validTweets.length,
          });
        }
      } catch (error) {
        console.error('Error processing account:', config.source_account, error);
        results.push({
          account: config.source_account,
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to fetch tweets'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Auto fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 