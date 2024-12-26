import { TwitterApi } from 'twitter-api-v2';

interface Tweet {
  id: string;
  text: string;
  images: string[];
  timestamp: string;
  authorName: string;
  authorUsername: string;
  authorImage: string;
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

    // Fetch tweets with media fields
    const tweets = await client.v2.userTimeline(user.data.id, {
      max_results: 5,
      'tweet.fields': ['created_at', 'attachments', 'author_id'],
      'user.fields': ['profile_image_url', 'name', 'username'],
      'media.fields': ['url', 'preview_image_url'],
      expansions: ['attachments.media_keys', 'author_id'],
    });

    // Transform tweets to match our interface
    const transformedTweets: Tweet[] = [];
    
    for await (const tweet of tweets) {
      const media = tweets.includes?.media || [];
      const author = tweets.includes?.users?.find(u => u.id === tweet.author_id);
      
      transformedTweets.push({
        id: tweet.id,
        text: tweet.text,
        images: media
          .filter(m => m.type === 'photo' && tweet.attachments?.media_keys?.includes(m.media_key))
          .map(m => m.url || m.preview_image_url)
          .filter((url): url is string => !!url),
        timestamp: tweet.created_at || new Date().toISOString(),
        authorName: author?.name || '',
        authorUsername: author?.username || '',
        authorImage: author?.profile_image_url || '',
      });
    }

    console.log(`Successfully fetched ${transformedTweets.length} tweets`);
    return transformedTweets;

  } catch (error) {
    console.error('Error fetching tweets:', error);
    throw error;
  }
} 