import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/options';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import crypto from 'crypto';

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

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userUUID = generateUUID(session.user.id);

    // Get the keys
    const { data, error } = await supabaseAdmin
      .from('twitter_keys')
      .select('*')
      .eq('user_id', userUUID)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching API keys:', error);
      return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
    }

    return NextResponse.json(data || {});
  } catch (error) {
    console.error('Error in GET /api/keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userUUID = generateUUID(session.user.id);
    const body = await request.json();
    
    const { error } = await supabaseAdmin
      .from('twitter_keys')
      .upsert({
        user_id: userUUID,
        api_key: body.twitter_api,
        api_secret: body.twitter_api_secret,
        access_token: body.twitter_access_token,
        access_token_secret: body.twitter_access_secret,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving API keys:', error);
      return NextResponse.json({ error: 'Failed to save API keys' }, { status: 500 });
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error in POST /api/keys:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 