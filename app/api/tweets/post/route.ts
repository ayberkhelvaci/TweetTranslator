import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { TwitterApi } from 'twitter-api-v2';
import axios from 'axios';

export async function POST(req: Request) {
  try {
    const { tweetId } = await req.json();

    // Get tweet details
    const { data: tweet, error: tweetError } = await supabaseAdmin
      .from('tweets')
      .select('*')
      .eq('source_tweet_id', tweetId)
      .single();

    if (tweetError || !tweet) {
      return NextResponse.json(
        { error: 'Tweet not found' },
        { status: 404 }
      );
    }

    // Get Twitter API keys
    const { data: keys, error: keysError } = await supabaseAdmin
      .from('twitter_keys')
      .select('*')
      .eq('user_id', tweet.user_id)
      .single();

    if (keysError || !keys) {
      return NextResponse.json(
        { error: 'Twitter API keys not found' },
        { status: 404 }
      );
    }

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: keys.api_key,
      appSecret: keys.api_secret,
      accessToken: keys.access_token,
      accessSecret: keys.access_token_secret,
    });

    // Upload media if present
    let mediaIds: string[] = [];
    if (tweet.media_attachments && tweet.media_attachments.length > 0) {
      try {
        for (const media of tweet.media_attachments) {
          // Get the media URL correctly whether it's a string or object
          const mediaUrl = typeof media === 'string' ? media : media.url;
          if (!mediaUrl) continue;

          // Download the media file
          const response = await axios.get(mediaUrl, { responseType: 'arraybuffer' });
          const buffer = Buffer.from(response.data);

          // Upload to Twitter
          const mediaId = await client.v1.uploadMedia(buffer, {
            mimeType: response.headers['content-type'],
          });
          mediaIds.push(mediaId);
        }
      } catch (error) {
        console.error('Error uploading media:', error);
        return NextResponse.json(
          { error: 'Failed to upload media' },
          { status: 500 }
        );
      }
    }

    // Prepare tweet text
    let tweetText = tweet.translated_text || tweet.original_text;

    // Post tweet
    try {
      const tweetOptions: any = {
        text: tweetText,
      };

      // Add media if we have any
      if (mediaIds.length > 0) {
        tweetOptions.media = { media_ids: mediaIds };
      }

      const postedTweet = await client.v2.tweet(tweetOptions);

      // Update tweet status in database
      await supabaseAdmin
        .from('tweets')
        .update({
          status: 'posted',
          posted_tweet_id: postedTweet.data.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tweetId);

      return NextResponse.json({
        status: 'posted',
        tweetId: postedTweet.data.id,
      });
    } catch (error: any) {
      console.error('Error posting tweet:', error);

      // Check for duplicate content
      if (error.code === 403 && error.data?.detail?.includes('duplicate content')) {
        return NextResponse.json(
          { error: 'duplicate content' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: error.message || 'Failed to post tweet' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in post tweet API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 