import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getLatestTweets } from '@/lib/services/twitterApi';
import { processTweet } from '@/lib/services/tweetProcessor';

export async function POST(req: Request) {
  try {
    // Verify the secret token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    
    if (!token || token !== process.env.CRON_SECRET) {
      console.log('Auth failed. Received token:', token?.slice(0, 10));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user configurations
    const { data: configs, error: configError } = await supabaseAdmin
      .from('config')
      .select('*')
      .eq('is_active', true);

    if (configError) {
      throw new Error('Failed to fetch user configurations');
    }

    const results = [];

    // Process each user's configuration
    for (const config of configs || []) {
      try {
        console.log(`Processing tweets for user ${config.user_id}`);

        // Get latest tweets for the source account
        const tweets = await getLatestTweets(config.source_account);
        
        // Process and store each tweet
        for (const tweet of tweets) {
          try {
            // Process the tweet
            const processedTweet = processTweet(tweet);

            // Check if tweet already exists
            const { data: existingTweet } = await supabaseAdmin
              .from('tweets')
              .select('id')
              .eq('source_tweet_id', tweet.id)
              .single();

            if (existingTweet) {
              console.log(`Tweet ${tweet.id} already exists, skipping`);
              continue;
            }

            // Insert the tweet
            const { error: insertError } = await supabaseAdmin
              .from('tweets')
              .insert({
                ...processedTweet,
                user_id: config.user_id
              });

            if (insertError) {
              throw new Error(`Failed to insert tweet: ${insertError.message}`);
            }

            results.push({
              tweet_id: tweet.id,
              status: 'success'
            });
          } catch (tweetError) {
            console.error('Error processing tweet:', tweetError);
            results.push({
              tweet_id: tweet.id,
              status: 'error',
              message: tweetError instanceof Error ? tweetError.message : 'Failed to process tweet'
            });
          }
        }
      } catch (userError) {
        console.error('Error processing user:', userError);
        results.push({
          user_id: config.user_id,
          status: 'error',
          message: userError instanceof Error ? userError.message : 'Failed to process user'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Auto-fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 