import { NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/options';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's Twitter API keys
    const { data: keys, error: keysError } = await supabaseAdmin
      .from('twitter_keys')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (keysError || !keys) {
      return NextResponse.json({ error: 'Twitter API keys not found' }, { status: 404 });
    }

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: keys.api_key,
      appSecret: keys.api_secret,
      accessToken: keys.access_token,
      accessSecret: keys.access_token_secret,
    });

    // Fetch user's profile
    const me = await client.v2.me({
      'user.fields': ['profile_image_url', 'name', 'username']
    });

    return NextResponse.json({
      name: me.data.name,
      username: me.data.username,
      profile_image_url: me.data.profile_image_url
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch profile' },
      { status: 500 }
    );
  }
} 