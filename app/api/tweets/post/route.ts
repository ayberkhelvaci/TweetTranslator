import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TwitterApi } from 'twitter-api-v2';

const MAX_TWEET_LENGTH = 140; // Standard Twitter character limit

export async function POST(request: Request) {
  try {
    const { tweetId } = await request.json();

    // Get the tweet from the database
    const { data: tweet, error: tweetError } = await supabaseAdmin
      .from('tweets')
      .select('*')
      .eq('source_tweet_id', tweetId)
      .single();

    if (tweetError || !tweet) {
      console.error('Tweet fetch error:', tweetError);
      throw new Error('Tweet not found');
    }

    // Check if tweet is already posted
    if (tweet.status === 'posted') {
      return NextResponse.json({
        error: 'Tweet has already been posted',
        status: 'posted'
      }, { status: 400 });
    }

    if (!tweet.translated_text) {
      throw new Error('Tweet has not been translated yet');
    }

    // Check character limit before attempting to post
    if (tweet.translated_text.length > MAX_TWEET_LENGTH) {
      await supabaseAdmin
        .from('tweets')
        .update({
          status: 'failed',
          error_message: `Tweet exceeds ${MAX_TWEET_LENGTH} character limit (${tweet.translated_text.length} characters)`,
          updated_at: new Date().toISOString()
        })
        .eq('id', tweet.id);

      return NextResponse.json({
        error: `Tweet exceeds ${MAX_TWEET_LENGTH} character limit`,
        status: 'failed'
      }, { status: 400 });
    }

    // Get Twitter API keys
    const { data: keys, error: keysError } = await supabaseAdmin
      .from('twitter_keys')
      .select('*')
      .single();

    if (keysError || !keys) {
      console.error('Twitter keys fetch error:', keysError);
      throw new Error('Twitter API keys not found');
    }

    // Initialize Twitter client with v2 settings
    const client = new TwitterApi({
      appKey: keys.api_key,
      appSecret: keys.api_secret,
      accessToken: keys.access_token,
      accessSecret: keys.access_token_secret,
    }).v2;

    try {
      // Post the translated tweet
      const postedTweet = await client.tweet(tweet.translated_text);

      // Update the tweet status in the database
      const { error: updateError } = await supabaseAdmin
        .from('tweets')
        .update({
          status: 'posted',
          posted_tweet_id: postedTweet.data.id,
          updated_at: new Date().toISOString(),
          error_message: null
        })
        .eq('id', tweet.id);

      if (updateError) {
        console.error('Database update error after successful post:', updateError);
        // Try one more time with a delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        const { error: retryError } = await supabaseAdmin
          .from('tweets')
          .update({
            status: 'posted',
            posted_tweet_id: postedTweet.data.id,
            updated_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', tweet.id);

        if (retryError) {
          console.error('Database update retry failed:', retryError);
        }
      }

      // Return success response with the updated status
      return NextResponse.json({
        success: true,
        tweetId: postedTweet.data.id,
        status: 'posted',
        message: 'Tweet posted successfully'
      });

    } catch (twitterError: any) {
      console.error('Twitter API error:', {
        error: twitterError,
        data: twitterError.data,
        code: twitterError.code,
        message: twitterError.message
      });

      // Check if it's a duplicate content error
      const isDuplicate = twitterError.data?.detail?.includes('duplicate content') ||
        twitterError.message?.includes('duplicate content');

      if (isDuplicate) {
        // If it's a duplicate, mark as posted since it means the tweet exists
        const { error: updateError } = await supabaseAdmin
          .from('tweets')
          .update({
            status: 'posted',
            updated_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', tweet.id);

        if (updateError) {
          console.error('Error updating tweet status for duplicate:', updateError);
        }

        return NextResponse.json({
          error: 'You are not allowed to create a Tweet with duplicate content.',
          status: 'posted'
        }, { status: 400 });
      }

      // Handle rate limits
      if (twitterError.code === 429 || (twitterError.data?.detail && twitterError.data.detail.includes('rate limit'))) {
        const { error: updateError } = await supabaseAdmin
          .from('tweets')
          .update({
            status: 'queued',
            error_message: 'Rate limited - queued for later posting',
            retry_after: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', tweet.id);

        if (updateError) {
          console.error('Error updating tweet status for rate limit:', updateError);
        }

        return NextResponse.json({
          error: 'Rate limited - tweet has been queued',
          status: 'queued'
        }, { status: 429 });
      }

      // Handle other errors
      const errorMessage = twitterError.data?.detail || twitterError.message || 'Failed to post tweet';
      
      const { error: updateError } = await supabaseAdmin
        .from('tweets')
        .update({
          status: 'failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', tweet.id);

      if (updateError) {
        console.error('Error updating tweet status for failure:', updateError);
      }

      return NextResponse.json({
        error: errorMessage,
        status: 'failed'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error posting tweet:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post tweet' },
      { status: 500 }
    );
  }
} 