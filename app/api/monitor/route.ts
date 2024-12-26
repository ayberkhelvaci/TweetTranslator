import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/options';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { checkLatestTweet } from '../../../lib/services/tweetMonitor';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

    console.log(`Starting tweet check for account: ${config.source_account}`);
    
    // Check for new tweets
    const tweets = await checkLatestTweet(session.user.id);

    return NextResponse.json({
      success: true,
      message: `Successfully checked for new tweets`,
      newTweets: tweets.length
    });

  } catch (error) {
    console.error('Failed to monitor tweets:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to monitor tweets' },
      { status: 500 }
    );
  }
} 