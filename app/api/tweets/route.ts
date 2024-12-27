import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/options';
import { supabaseAdmin } from '../../../lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get tweets with proper ordering
    const { data: tweets, error } = await supabaseAdmin
      .from('tweets')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tweets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tweets' },
        { status: 500 }
      );
    }

    // Transform tweets to ensure all required fields are present
    const transformedTweets = tweets?.map(tweet => ({
      ...tweet,
      translated_text: tweet.translated_text || null,
      error_message: tweet.error_message || null,
      posted_tweet_id: tweet.posted_tweet_id || null,
      image_urls: tweet.image_urls || [],
      status: tweet.status || 'pending'
    })) || [];

    return NextResponse.json(transformedTweets);
  } catch (error) {
    console.error('Error in tweets API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 