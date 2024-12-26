import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/options';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Create the table if it doesn't exist
    const { error: tableError } = await supabaseAdmin
      .from('twitter_keys')
      .select('count')
      .limit(1)
      .then(async ({ error }) => {
        if (error && error.code === '42P01') {
          // Table doesn't exist, create it
          return await supabaseAdmin.query(`
            CREATE TABLE IF NOT EXISTS twitter_keys (
              user_id TEXT PRIMARY KEY,
              api_key TEXT,
              api_secret TEXT,
              access_token TEXT,
              access_token_secret TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
            );
            
            CREATE TRIGGER update_twitter_keys_updated_at
              BEFORE UPDATE ON twitter_keys
              FOR EACH ROW
              EXECUTE FUNCTION update_updated_at_column();
          `);
        }
        return { error: null };
      });

    if (tableError) {
      console.error('Error creating table:', tableError);
      return NextResponse.json(
        { error: 'Database initialization failed' },
        { status: 500 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('twitter_keys')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching API keys:', error);
      return NextResponse.json(
        { error: 'Failed to fetch API keys' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || {});
  } catch (error) {
    console.error('Error in GET /api/keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const { error } = await supabaseAdmin
      .from('twitter_keys')
      .upsert({
        user_id: session.user.id,
        api_key: body.twitter_api,
        api_secret: body.twitter_api_secret,
        access_token: body.twitter_access_token,
        access_token_secret: body.twitter_access_secret,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving API keys:', error);
      return NextResponse.json(
        { error: 'Failed to save API keys' },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error in POST /api/keys:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 