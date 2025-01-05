import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/options';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { generateUUID } from '@/lib/utils';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userUUID = generateUUID(session.user.id);
    const tweetId = params.id;

    const { data: tweet, error } = await supabaseAdmin
      .from('tweets')
      .select('*')
      .eq('user_id', userUUID)
      .eq('source_tweet_id', tweetId)
      .single();

    if (error) {
      console.error('Error fetching tweet:', error);
      return NextResponse.json({ error: 'Tweet not found' }, { status: 404 });
    }

    return NextResponse.json(tweet);
  } catch (error) {
    console.error('Error in tweet fetch:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tweet' },
      { status: 500 }
    );
  }
} 