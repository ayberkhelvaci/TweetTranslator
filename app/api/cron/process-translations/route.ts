import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { translateText } from '../../../../lib/services/openai';

async function getConfig() {
  const { data, error } = await supabase
    .from('config')
    .select('target_language')
    .single();
    
  if (error || !data) {
    throw new Error('Configuration not found');
  }
  
  return data;
}

export async function GET() {
  try {
    // Get pending tweets
    const { data: tweets, error } = await supabase
      .from('tweets')
      .select('*')
      .eq('status', 'pending')
      .limit(5);

    if (error) throw error;
    if (!tweets.length) {
      return NextResponse.json({ message: 'No pending tweets' });
    }

    const config = await getConfig();

    // Process each tweet
    for (const tweet of tweets) {
      try {
        const translation = await translateText(
          tweet.original_text,
          config.target_language
        );

        await supabase
          .from('tweets')
          .update({
            translated_text: translation,
            status: 'translated',
            updated_at: new Date().toISOString()
          })
          .eq('id', tweet.id);

      } catch (err) {
        console.error(`Failed to translate tweet ${tweet.id}:`, err);
        // Mark as failed but don't stop processing other tweets
        await supabase
          .from('tweets')
          .update({
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', tweet.id);
      }
    }

    return NextResponse.json({ 
      message: `Processed ${tweets.length} tweets` 
    });

  } catch (error) {
    console.error('Translation processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process translations' },
      { status: 500 }
    );
  }
} 