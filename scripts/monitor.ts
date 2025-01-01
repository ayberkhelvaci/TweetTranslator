import { supabaseAdmin } from '@/lib/supabase-admin';
import { TwitterApi } from 'twitter-api-v2';
import OpenAI from 'openai';

async function translateTweet(text: string, targetLanguage: string): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = `Translate the following tweet to ${targetLanguage}. Maintain the same tone and style, and keep any hashtags or mentions in their original form:\n\n${text}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    });

    return response.choices[0].message?.content || text;
  } catch (error) {
    console.error('Translation error:', error);
    throw new Error('Failed to translate tweet');
  }
}

async function postTweet(client: TwitterApi, text: string): Promise<string> {
  try {
    const tweet = await client.v2.tweet(text);
    return tweet.data.id;
  } catch (error) {
    console.error('Error posting tweet:', error);
    throw new Error('Failed to post tweet');
  }
}

async function processUser(userId: string) {
  try {
    // Get user's configuration
    const { data: config } = await supabaseAdmin
      .from('configurations')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!config) {
      console.log(`No configuration found for user ${userId}`);
      return;
    }

    // Get Twitter API keys
    const { data: keys } = await supabaseAdmin
      .from('twitter_keys')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!keys) {
      console.log(`No Twitter API keys found for user ${userId}`);
      return;
    }

    // Initialize Twitter client
    const client = new TwitterApi({
      appKey: keys.api_key,
      appSecret: keys.api_secret,
      accessToken: keys.access_token,
      accessSecret: keys.access_token_secret,
    });

    // Get pending tweets
    const { data: pendingTweets } = await supabaseAdmin
      .from('tweets')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('posted_at', { ascending: true });

    if (!pendingTweets || pendingTweets.length === 0) {
      console.log(`No pending tweets found for user ${userId}`);
      return;
    }

    // Process each tweet
    for (const tweet of pendingTweets) {
      try {
        // Update status to translating
        await supabaseAdmin
          .from('tweets')
          .update({ status: 'translating' })
          .eq('tweet_id', tweet.tweet_id);

        // Translate tweet
        const translatedText = await translateTweet(tweet.content, config.target_language);

        // Update status to translated
        await supabaseAdmin
          .from('tweets')
          .update({
            status: 'translated',
            translated_content: translatedText,
          })
          .eq('tweet_id', tweet.tweet_id);

        // Post translated tweet
        const postedTweetId = await postTweet(client, translatedText);

        // Update status to posted
        await supabaseAdmin
          .from('tweets')
          .update({
            status: 'posted',
            posted_tweet_id: postedTweetId,
          })
          .eq('tweet_id', tweet.tweet_id);

        console.log(`Successfully processed tweet ${tweet.tweet_id}`);

        // Wait a bit between tweets to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (error) {
        console.error(`Error processing tweet ${tweet.tweet_id}:`, error);

        // Update tweet with error status
        await supabaseAdmin
          .from('tweets')
          .update({
            status: 'error',
            error_message: error instanceof Error ? error.message : 'Unknown error',
          })
          .eq('tweet_id', tweet.tweet_id);
      }
    }
  } catch (error) {
    console.error(`Error processing user ${userId}:`, error);
  }
}

async function main() {
  try {
    // Get all users with active configurations
    const { data: users } = await supabaseAdmin
      .from('configurations')
      .select('user_id');

    if (!users || users.length === 0) {
      console.log('No users found with configurations');
      return;
    }

    // Process each user
    for (const user of users) {
      await processUser(user.user_id);
    }
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

main(); 