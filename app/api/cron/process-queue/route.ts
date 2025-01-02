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

        // Get Twitter API keys
        console.log('Fetching Twitter keys for user_id:', tweet.user_id);
        const { data: keys, error: keysError } = await supabaseAdmin
          .from('twitter_keys')
          .select('*')
          .eq('user_id', tweet.user_id)
          .single();

        if (keysError || !keys) {
          console.error('Twitter keys fetch error:', keysError);
          throw new Error('Twitter API keys not found');
        }
        console.log('Found Twitter keys:', {
          hasApiKey: !!keys.api_key,
          hasApiSecret: !!keys.api_secret,
          hasAccessToken: !!keys.access_token,
          hasAccessSecret: !!keys.access_token_secret
        });

        // Initialize Twitter client
        const client = new TwitterApi({
          appKey: keys.api_key,
          appSecret: keys.api_secret,
          accessToken: keys.access_token,
          accessSecret: keys.access_token_secret,
        });

        // Post tweet
        try {
          console.log('Attempting to post tweet:', {
            user_id: tweet.user_id,
            tweet_id: tweet.source_tweet_id,
            text_length: tweet.translated_text?.length
          });

          let tweetStatus = 'failed';
          let tweetMessage = '';
          let postedTweetId = null;

          try {
            const postedTweet = await client.v2.tweet(tweet.translated_text);
            console.log('Successfully posted tweet:', postedTweet.data.id);
            tweetStatus = 'posted';
            postedTweetId = postedTweet.data.id;
            tweetMessage = 'Tweet posted successfully';
          } catch (twitterError: any) {
            // Log the complete error object
            console.error('Full Twitter API error:', JSON.stringify(twitterError, null, 2));
            console.error('Twitter API error details:', {
              error: twitterError,
              code: twitterError.code,
              data: twitterError.data,
              message: twitterError.message,
              errors: twitterError.errors,
              stack: twitterError.stack,
              type: twitterError.type,
              title: twitterError.title,
              detail: twitterError.detail
            });

            if (twitterError.errors?.length > 0) {
              tweetMessage = `${twitterError.errors[0].title || ''}: ${twitterError.errors[0].detail || twitterError.errors[0].message || ''}`.trim();
            } else if (twitterError.error?.description) {
              tweetMessage = twitterError.error.description;
            } else if (twitterError.message) {
              tweetMessage = twitterError.message;
            } else {
              tweetMessage = 'Failed to post tweet';
            }
          }

          // Always try to update the tweet status, regardless of whether posting succeeded or failed
          try {
            const updateData: {
              status: string;
              error_message: string | null;
              updated_at: string;
              posted_tweet_id?: string;
            } = {
              status: tweetStatus,
              error_message: tweetStatus === 'failed' ? tweetMessage : null,
              updated_at: new Date().toISOString()
            };

            if (postedTweetId) {
              updateData.posted_tweet_id = postedTweetId;
            }

            const { error: updateError } = await supabaseAdmin
              .from('tweets')
              .update(updateData)
              .eq('id', tweet.id);

            if (updateError) {
              console.error('Status update error for tweet:', tweet.id, updateError);
              tweetMessage = 'Tweet posted but failed to update status';
            }
          } catch (updateError) {
            console.error('Failed to update tweet status:', updateError);
            tweetMessage = 'Tweet posted but failed to update status';
          }

          // Mark this user as processed in this batch
          processedUserIds.add(tweet.user_id);

          results.push({
            tweet_id: tweet.source_tweet_id,
            status: tweetStatus === 'posted' ? 'success' : 'error',
            message: tweetMessage
          });
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