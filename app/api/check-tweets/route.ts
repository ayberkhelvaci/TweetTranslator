import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/options';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's configuration
    const { data: config } = await supabaseAdmin
      .from('configurations')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (!config) {
      return NextResponse.json({ error: 'No configuration found' }, { status: 404 });
    }

    // Get Twitter API keys
    const { data: keys } = await supabaseAdmin
      .from('twitter_keys')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (!keys) {
      return NextResponse.json({ error: 'Twitter API keys not found' }, { status: 404 });
    }

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: keys.api_key,
      appSecret: keys.api_secret,
      accessToken: keys.access_token,
      accessSecret: keys.access_token_secret,
    });

    // Get the user ID for the target account
    const targetUser = await client.v2.userByUsername(config.target_account);
    if (!targetUser.data) {
      return NextResponse.json({ error: 'Target account not found' }, { status: 404 });
    }

    // Get the last tweet ID we processed
    const { data: lastTweet } = await supabaseAdmin
      .from('tweets')
      .select('tweet_id')
      .eq('user_id', session.user.id)
      .order('posted_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch tweets
    const tweetsResponse = await client.v2.userTimeline(targetUser.data.id, {
      'tweet.fields': ['created_at'],
      'user.fields': ['profile_image_url', 'username', 'name'],
      expansions: ['author_id'],
      max_results: 10,
      ...(lastTweet ? { since_id: lastTweet.tweet_id } : {}),
    });

    const tweets = tweetsResponse.data;
    if (!tweets || tweets.length === 0) {
      return NextResponse.json({ message: 'No new tweets found' });
    }

    const tweetAuthor = tweetsResponse.includes?.users?.[0];
    
    // Store tweets in database
    const { error: upsertError } = await supabaseAdmin
      .from('tweets')
      .upsert(
        tweets.map((tweet: TweetV2) => ({
          tweet_id: tweet.id,
          user_id: session.user.id,
          content: tweet.text,
          author_name: tweetAuthor?.name,
          author_username: tweetAuthor?.username,
          author_image: tweetAuthor?.profile_image_url,
          posted_at: tweet.created_at,
          status: 'pending'
        })),
        { onConflict: 'tweet_id,user_id' }
      );

    if (upsertError) {
      console.error('Error storing tweets:', upsertError);
      return NextResponse.json({ error: 'Failed to store tweets' }, { status: 500 });
    }

    // Update rate limits if provided
    const rateLimits = tweetsResponse.rateLimit;
    if (rateLimits) {
      await supabaseAdmin
        .from('rate_limits')
        .upsert({
          user_id: session.user.id,
          remaining: rateLimits.remaining,
          limit: rateLimits.limit,
          reset_at: new Date(rateLimits.reset * 1000).toISOString(),
        });
    }

    return NextResponse.json({ 
      message: 'Tweets checked successfully',
      tweetsFound: tweets.length
    });

  } catch (error) {
    console.error('Error checking tweets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check tweets' },
      { status: 500 }
    );
  }
} 