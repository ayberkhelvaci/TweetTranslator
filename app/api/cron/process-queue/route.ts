import { NextResponse } from 'next/server';
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

export async function POST(req: Request) {
  try {
    // Verify the secret token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    
    if (!token || token !== process.env.CRON_SECRET) {
      console.log('Auth failed. Received token:', token?.slice(0, 10));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all queued tweets ordered by created_at
    const { data: tweets, error: tweetsError } = await supabaseAdmin
      .from('tweets')
      .select('*, config:user_id(target_language)')
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(10); // Process max 10 tweets per batch

    if (tweetsError) {
      throw new Error('Failed to fetch queued tweets');
    }

    const results = [];
    const processedUserIds = new Set();

    // Process each tweet
    for (const tweet of tweets || []) {
      try {
        // Skip if we already processed a tweet for this user in this batch
        if (processedUserIds.has(tweet.user_id)) {
          results.push({
            tweet_id: tweet.source_tweet_id,
            status: 'skipped',
            message: 'Rate limit protection: One tweet per user per batch'
          });
          continue;
        }

        // Get Twitter API keys (user_id is already a UUID)
        const { data: keys, error: keysError } = await supabaseAdmin
          .from('twitter_keys')
          .select('*')
          .eq('user_id', tweet.user_id)
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

        // Post tweet
        try {
          const postedTweet = await client.v2.tweet(tweet.translated_text);

          // Update tweet status
          const { error: updateError } = await supabaseAdmin
            .from('tweets')
            .update({
              status: 'posted',
              posted_tweet_id: postedTweet.data.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', tweet.id);

          if (updateError) {
            console.error('Update error:', updateError);
            throw new Error('Failed to update tweet status');
          }

          // Mark this user as processed in this batch
          processedUserIds.add(tweet.user_id);

          results.push({
            tweet_id: tweet.source_tweet_id,
            status: 'success',
            message: 'Tweet posted successfully'
          });
        } catch (twitterError: any) {
          console.error('Twitter API error details:', {
            error: twitterError,
            code: twitterError.code,
            data: twitterError.data,
            message: twitterError.message,
            errors: twitterError.errors
          });

          // Update tweet status to failed with detailed error
          await supabaseAdmin
            .from('tweets')
            .update({
              status: 'failed',
              error_message: twitterError.errors?.[0]?.message || twitterError.message || 'Failed to post tweet',
              updated_at: new Date().toISOString()
            })
            .eq('id', tweet.id);

          results.push({
            tweet_id: tweet.source_tweet_id,
            status: 'error',
            message: twitterError.errors?.[0]?.message || twitterError.message || 'Failed to post tweet'
          });
        }
      } catch (error) {
        console.error('Error posting tweet:', tweet.source_tweet_id, error);
        
        // Update tweet status to failed
        await supabaseAdmin
          .from('tweets')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Failed to post tweet',
            updated_at: new Date().toISOString()
          })
          .eq('id', tweet.id);

        results.push({
          tweet_id: tweet.source_tweet_id,
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
    console.error('Process queue error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 