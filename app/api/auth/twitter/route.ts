import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use Twitter's OAuth 2.0 authorization endpoint
    const signInUrl = new URL('https://twitter.com/i/oauth2/authorize');
    
    // Add required OAuth parameters
    signInUrl.searchParams.append('response_type', 'code');
    signInUrl.searchParams.append('client_id', process.env.TWITTER_CLIENT_ID!);
    signInUrl.searchParams.append('redirect_uri', process.env.NEXTAUTH_URL + '/api/auth/callback/twitter');
    signInUrl.searchParams.append('scope', 'users.read tweet.read tweet.write offline.access');
    signInUrl.searchParams.append('state', 'state-' + Date.now());
    signInUrl.searchParams.append('force_login', 'true');
    
    return NextResponse.redirect(signInUrl);
  } catch (error) {
    console.error('Error in Twitter auth:', error);
    return NextResponse.json({ error: 'Failed to authenticate with Twitter' }, { status: 500 });
  }
} 