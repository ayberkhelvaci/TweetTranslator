import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { TwitterApi } from 'twitter-api-v2';

interface QueueResult {
  tweet_id: string;
  status: 'success' | 'error';
  message: string;
}

export async function POST(req: Request) {
  try {
    // Verify the secret token
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all queued tweets
    const { data: queuedTweets, error: queueError } = await supabaseAdmin
      .from('tweets')
      .select('*, config:user_id(twitter_keys(*), target_language)')
      .eq('status', 'queued')
      .order('created_at', { ascending: true });

    if (queueError) {
      throw new Error('Failed to fetch queued tweets');
    }

    const results: QueueResult[] = [];

    // Process each queued tweet
    for (const tweet of queuedTweets || []) {
      try {
        const twitterClient = new TwitterApi({
          appKey: tweet.config.twitter_keys.api_key,
          appSecret: tweet.config.twitter_keys.api_secret,
          accessToken: tweet.config.twitter_keys.access_token,
          accessSecret: tweet.config.twitter_keys.access_token_secret,
        });

        // Post the tweet
        const postedTweet = await twitterClient.v2.tweet(tweet.translated_text);

        // Update tweet status
        await supabaseAdmin
          .from('tweets')
          .update({
            status: 'posted',
            updated_at: new Date().toISOString()
          })
          .eq('id', tweet.id);

        results.push({
          tweet_id: tweet.id,
          status: 'success',
          message: 'Tweet posted successfully'
        });
      } catch (error: any) {
        // If it's a rate limit error, update the rate limit info
        if (error.code === 429) {
          const resetTime = new Date(Number(error.rateLimit?.reset) * 1000);
          await supabaseAdmin
            .from('rate_limits')
            .upsert({
              user_id: tweet.user_id,
              reset: resetTime.getTime(),
              remaining: 0,
              endpoint: 'tweet',
              updated_at: new Date().toISOString()
            });
        }

        results.push({
          tweet_id: tweet.id,
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to post tweet'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Queue processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 