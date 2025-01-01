import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/options';
import crypto from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to generate a UUID from a string
function generateUUID(str: string): string {
  const hash = crypto.createHash('sha256').update(str).digest();
  const uuid = [
    hash.slice(0, 4).toString('hex'),
    hash.slice(4, 6).toString('hex'),
    hash.slice(6, 8).toString('hex'),
    hash.slice(8, 10).toString('hex'),
    hash.slice(10, 16).toString('hex'),
  ].join('-');
  return uuid;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tweetId } = await request.json();
    const userUUID = generateUUID(session.user.id);

    console.log('Debug - Query params:', {
      userUUID,
      tweetId,
      originalUserId: session.user.id
    });

    // Get the tweet from the database
    const { data: tweet, error: tweetError } = await supabaseAdmin
      .from('tweets')
      .select('*')
      .eq('user_id', userUUID)
      .eq('source_tweet_id', tweetId)
      .single();

    if (tweetError) {
      console.error('Tweet error:', tweetError);
      // Let's also log what's in the database for this user
      const { data: userTweets } = await supabaseAdmin
        .from('tweets')
        .select('source_tweet_id, user_id')
        .eq('user_id', userUUID);
      console.log('Debug - Available tweets for user:', userTweets);
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
      .eq('user_id', userUUID)
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