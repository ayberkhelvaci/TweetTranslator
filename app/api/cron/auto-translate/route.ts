import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    // Verify the secret token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '').trim();
    
    if (!token || token !== process.env.CRON_SECRET) {
      console.log('Auth failed. Received token:', token?.slice(0, 10));
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all pending_auto tweets with their config
    const { data: tweets, error: tweetsError } = await supabaseAdmin
      .from('tweets')
      .select('*, config:user_id(target_language)')
      .eq('status', 'pending_auto');

    if (tweetsError) {
      throw new Error('Failed to fetch pending tweets');
    }

    const results = [];

    // Process each tweet
    for (const tweet of tweets || []) {
      try {
        // Get translation
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the following tweet to ${tweet.config.target_language}. Maintain the same tone and style. Only respond with the translation, no explanations.`
            },
            {
              role: 'user',
              content: tweet.original_text
            }
          ],
          model: 'gpt-3.5-turbo',
        });

        const translatedText = completion.choices[0]?.message?.content;

        if (!translatedText) {
          throw new Error('No translation received');
        }

        // Update tweet with translation and queue it
        const { error: updateError } = await supabaseAdmin
          .from('tweets')
          .update({
            translated_text: translatedText,
            status: 'queued',
            updated_at: new Date().toISOString()
          })
          .eq('id', tweet.id);

        if (updateError) {
          throw new Error('Failed to update tweet');
        }

        results.push({
          tweet_id: tweet.source_tweet_id,
          status: 'success',
          message: 'Translation completed and queued'
        });
      } catch (error) {
        console.error('Error processing tweet:', tweet.source_tweet_id, error);
        
        // Update tweet status to failed
        await supabaseAdmin
          .from('tweets')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Translation failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', tweet.id);

        results.push({
          tweet_id: tweet.source_tweet_id,
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to translate tweet'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Auto translate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 