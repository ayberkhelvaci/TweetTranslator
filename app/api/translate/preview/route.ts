import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { tweetId } = await request.json();

    // Get the tweet from the database
    const { data: tweet, error: tweetError } = await supabaseAdmin
      .from('tweets')
      .select('*')
      .eq('source_tweet_id', tweetId)
      .single();

    if (tweetError) {
      throw new Error('Tweet not found');
    }

    // If we already have a translation, return it
    if (tweet.translated_text) {
      return NextResponse.json({ translation: tweet.translated_text });
    }

    // Get translation from OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a professional translator. Translate the following tweet from Turkish to English. Keep the translation natural and conversational while maintaining the original meaning and tone."
        },
        {
          role: "user",
          content: tweet.original_text
        }
      ],
    });

    const translation = completion.choices[0]?.message?.content;

    if (!translation) {
      throw new Error('Failed to generate translation');
    }

    // Store the translation in the database
    const { error: updateError } = await supabaseAdmin
      .from('tweets')
      .update({ 
        translated_text: translation,
        status: 'translated'
      })
      .eq('source_tweet_id', tweetId);

    if (updateError) {
      throw new Error('Failed to save translation');
    }

    return NextResponse.json({ translation });
  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to translate tweet' },
      { status: 500 }
    );
  }
} 