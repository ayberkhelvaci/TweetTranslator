import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/options';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get Twitter API keys for the user
    const { data: keys, error: keysError } = await supabaseAdmin
      .from('twitter_keys')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (keysError || !keys) {
      return NextResponse.json(
        { error: 'Twitter API keys not found' },
        { status: 404 }
      );
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
      .select('source_account')
      .single();

    if (configError || !config?.source_account) {
      return NextResponse.json(
        { error: 'Source account not configured' },
        { status: 404 }
      );
    }

    // Clean up username
    const username = config.source_account.replace('@', '');
    console.log(`Fetching tweets for @${username}`);

    // Get user ID first
    const user = await client.v2.userByUsername(username);
    if (!user.data) {
      return NextResponse.json(
        { error: `User @${username} not found` },
        { status: 404 }
      );
    }

    // Fetch tweets with media fields
    const tweets = await client.v2.userTimeline(user.data.id, {
      max_results: 5,
      'tweet.fields': ['created_at', 'attachments'],
      'user.fields': ['profile_image_url', 'name', 'username'],
      'media.fields': ['url', 'preview_image_url'],
      expansions: ['attachments.media_keys', 'author_id'],
    });

    // Transform tweets to a more friendly format
    const transformedTweets: Array<{
      id: string;
      text: string;
      images: string[];
      timestamp: string;
      authorName: string;
      authorUsername: string;
      authorImage: string;
    }> = [];
    for await (const tweet of tweets) {
      const media = tweets.includes?.media || [];
      const author = tweets.includes?.users?.find(u => u.id === tweet.author_id);
      
      transformedTweets.push({
        id: tweet.id,
        text: tweet.text,
        images: media
          .filter(m => m.type === 'photo' && tweet.attachments?.media_keys?.includes(m.media_key))
          .map(m => m.url || m.preview_image_url)
          .filter((url): url is string => !!url),
        timestamp: tweet.created_at || new Date().toISOString(),
        authorName: author?.name || username,
        authorUsername: author?.username || username,
        authorImage: author?.profile_image_url || '',
      });
    }

    return NextResponse.json({
      success: true,
      tweets: transformedTweets,
    });

  } catch (error) {
    console.error('Error testing Twitter API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to test Twitter API' },
      { status: 500 }
    );
  }
} 