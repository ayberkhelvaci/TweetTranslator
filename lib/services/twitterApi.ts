import { TwitterApi } from 'twitter-api-v2';

interface Tweet {
  id: string;
  text: string;
  media_attachments: Array<{
    type: 'photo' | 'video' | 'animated_gif';
    url: string;
    preview_image_url?: string;
    alt_text?: string;
  }>;
  created_at: string;
  author: {
    id: string;
    name: string;
    username: string;
    profile_image_url: string;
  };
  conversation_id: string;
  referenced_tweets?: Array<{
    type: 'replied_to' | 'retweeted' | 'quoted';
    id: string;
  }>;
}

export async function getLatestTweets(username: string): Promise<Tweet[]> {
  try {
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY || '',
      appSecret: process.env.TWITTER_API_SECRET || '',
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_SECRET,
    });

    // Clean up username
    const cleanUsername = username.replace('@', '');
    console.log(`Fetching tweets for @${cleanUsername}`);

    // Get user ID first
    const user = await client.v2.userByUsername(cleanUsername);
    if (!user.data) {
      throw new Error(`User @${cleanUsername} not found`);
    }

    // Fetch tweets with all necessary fields
    const tweets = await client.v2.userTimeline(user.data.id, {
      max_results: 10,
      'tweet.fields': [
        'created_at',
        'attachments',
        'author_id',
        'conversation_id',
        'referenced_tweets',
        'entities',
        'note_tweet'
      ],
      'user.fields': [
        'id',
        'name',
        'username',
        'profile_image_url'
      ],
      'media.fields': [
        'type',
        'url',
        'preview_image_url',
        'alt_text',
        'media_key'
      ],
      expansions: [
        'attachments.media_keys',
        'author_id',
        'referenced_tweets.id',
        'referenced_tweets.id.author_id'
      ]
    });

    // Transform tweets to match our interface
    const transformedTweets: Tweet[] = [];
    
    for await (const tweet of tweets) {
      const media = tweets.includes?.media || [];
      const author = tweets.includes?.users?.find(u => u.id === tweet.author_id);
      
      // Process media attachments
      const mediaAttachments = media
        .filter(m => tweet.attachments?.media_keys?.includes(m.media_key))
        .map(m => ({
          type: m.type as 'photo' | 'video' | 'animated_gif',
          url: m.url || m.preview_image_url || '',
          preview_image_url: m.preview_image_url,
          alt_text: m.alt_text
        }));

      // Get full tweet text (handling note_tweet for longer tweets)
      const fullText = tweet.note_tweet?.text || tweet.text;

      // Check if tweet is part of a thread
      const isPartOfThread = tweet.referenced_tweets?.some(ref => ref.type === 'replied_to');
      
      transformedTweets.push({
        id: tweet.id,
        text: fullText,
        media_attachments: mediaAttachments,
        created_at: tweet.created_at || new Date().toISOString(),
        author: {
          id: author?.id || '',
          name: author?.name || '',
          username: author?.username || '',
          profile_image_url: author?.profile_image_url || ''
        },
        conversation_id: tweet.conversation_id || tweet.id,
        referenced_tweets: tweet.referenced_tweets
      });
    }

    // Sort tweets to maintain thread order
    transformedTweets.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    console.log(`Successfully fetched ${transformedTweets.length} tweets`);
    return transformedTweets;

  } catch (error) {
    console.error('Error fetching tweets:', error);
    throw error;
  }
} 