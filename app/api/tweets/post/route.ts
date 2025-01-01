import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/options';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TwitterApi } from 'twitter-api-v2';
import crypto from 'crypto';

// Extend the Session type to include accessToken
interface ExtendedSession {
  user?: {
    id?: string;
  };
  accessToken?: string;
  refreshToken?: string;
}

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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession;
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userUUID = generateUUID(session.user.id);
    const { tweetId } = await request.json();
    
    // Get the tweet from database
    const { data: tweet, error: tweetError } = await supabaseAdmin
      .from('tweets')
      .select('*')
      .eq('user_id', userUUID)
      .eq('source_tweet_id', tweetId)
      .single();

    if (tweetError || !tweet) {
      console.error('Error fetching tweet:', tweetError);
      return NextResponse.json(
        { error: 'Tweet not found' },
        { status: 404 }
      );
    }

    if (!tweet.translated_text) {
      return NextResponse.json(
        { error: 'Tweet has not been translated yet' },
        { status: 400 }
      );
    }

    // Get Twitter API keys
    const { data: keys, error: keysError } = await supabaseAdmin
      .from('twitter_keys')
      .select('*')
      .eq('user_id', userUUID)
      .single();

    if (keysError || !keys) {
      console.error('Twitter keys fetch error:', keysError);
      throw new Error('Twitter API keys not found');
    }

    try {
      // Initialize Twitter client with API keys
      const client = new TwitterApi({
        appKey: keys.api_key,
        appSecret: keys.api_secret,
        accessToken: keys.access_token,
        accessSecret: keys.access_token_secret,
      });
      
      // Post the translated tweet
      const postedTweet = await client.v2.tweet(tweet.translated_text);

      // Update the tweet status in the database
      const { error: updateError } = await supabaseAdmin
        .from('tweets')
        .update({
          status: 'posted',
          updated_at: new Date().toISOString(),
          error_message: null
        })
        .eq('id', tweet.id);

      if (updateError) {
        console.error('Database update error after successful post:', updateError);
      }

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

      // Handle rate limits
      if (twitterError.code === 429) {
        const resetTime = new Date(Number(twitterError.rateLimit?.reset) * 1000);
        const waitMinutes = Math.ceil((resetTime.getTime() - Date.now()) / (1000 * 60));
        const errorMessage = `Rate limit exceeded. Please try again in ${waitMinutes} minutes.`;

        // Update tweet status with error
        const { error: updateError } = await supabaseAdmin
          .from('tweets')
          .update({
            status: 'queued',
            error_message: errorMessage,
            updated_at: new Date().toISOString()
          })
          .eq('id', tweet.id);

        if (updateError) {
          console.error('Error updating tweet status:', updateError);
        }

        return NextResponse.json({
          error: errorMessage,
          status: 'queued',
          resetTime: resetTime.toISOString()
        }, { status: 429 });
      }

      // Update tweet status with error
      const { error: updateError } = await supabaseAdmin
        .from('tweets')
        .update({
          status: 'error',
          error_message: twitterError.message || 'Failed to post tweet',
          updated_at: new Date().toISOString()
        })
        .eq('id', tweet.id);

      if (updateError) {
        console.error('Error updating tweet status:', updateError);
      }

      return NextResponse.json({
        error: twitterError.message || 'Failed to post tweet',
        status: 'error'
      }, { status: twitterError.code || 500 });
    }
  } catch (error) {
    console.error('Error in POST /api/tweets/post:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to post tweet' },
      { status: 500 }
    );
  }
} 