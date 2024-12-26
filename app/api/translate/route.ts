import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth-config';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { translateText } from '@/lib/services/openai';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tweetId } = body;

    if (!tweetId) {
      return NextResponse.json(
        { error: 'Tweet ID is required' },
        { status: 400 }
      );
    }

    // Get the tweet from the database
    const { data: tweet, error: tweetError } = await supabaseAdmin
      .from('tweets')
      .select('*')
      .eq('source_tweet_id', tweetId)
      .eq('user_id', session.user.id)
      .single();

    if (tweetError || !tweet) {
      return NextResponse.json(
        { error: 'Tweet not found' },
        { status: 404 }
      );
    }

    // Get user's configuration for target language
    const { data: config, error: configError } = await supabaseAdmin
      .from('config')
      .select('target_language')
      .single();

    if (configError || !config?.target_language) {
      return NextResponse.json(
        { error: 'Target language not configured' },
        { status: 400 }
      );
    }

    // Update status to translating
    await supabaseAdmin
      .from('tweets')
      .update({ status: 'translating' })
      .eq('source_tweet_id', tweetId);

    try {
      // Translate the tweet
      const translatedText = await translateText(tweet.original_text, config.target_language);

      // Update the tweet with translation and mark as translated
      const { error: updateError } = await supabaseAdmin
        .from('tweets')
        .update({
          translated_text: translatedText,
          status: 'translated',
          updated_at: new Date().toISOString(),
        })
        .eq('source_tweet_id', tweetId);

      if (updateError) {
        throw new Error('Failed to update tweet with translation');
      }

      return NextResponse.json({
        success: true,
        message: 'Tweet translated successfully',
        translatedText,
      });

    } catch (error) {
      // Update status to failed if translation fails
      await supabaseAdmin
        .from('tweets')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Translation failed',
          updated_at: new Date().toISOString(),
        })
        .eq('source_tweet_id', tweetId);

      throw error;
    }

  } catch (error) {
    console.error('Error in translate endpoint:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to translate tweet'
      },
      { status: 500 }
    );
  }
} 