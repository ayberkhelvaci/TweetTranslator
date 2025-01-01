import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-config';
import { supabaseAdmin } from '@/lib/supabase-admin';
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

    const { data: config } = await supabaseAdmin
      .from('config')
      .select('*')
      .eq('user_id', userUUID)
      .single();

    if (config) {
      // Map created_at to registration_timestamp
      return NextResponse.json({
        ...config,
        registration_timestamp: config.created_at
      });
    }

    return NextResponse.json({});
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch config' },
      { status: 500 }
    );
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
    const { source_account, check_interval, target_language } = body;

    if (!source_account || !check_interval || !target_language) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Clean up the source account: remove any existing @ and add just one
    const cleanUsername = source_account.replace(/^@+/, ''); // Remove all @ from start
    const formattedSourceAccount = `@${cleanUsername}`; // Add single @

    // Check for existing config
    const { data: existingConfig } = await supabaseAdmin
      .from('config')
      .select('user_id')
      .eq('user_id', userUUID)
      .single();

    const configData = {
      user_id: userUUID,
      source_account: formattedSourceAccount,
      check_interval,
      target_language,
      updated_at: new Date().toISOString(),
    };

    // If no existing config, insert new. If exists, update.
    const { data, error } = existingConfig
      ? await supabaseAdmin
          .from('config')
          .update(configData)
          .eq('user_id', userUUID)
          .select()
          .single()
      : await supabaseAdmin
          .from('config')
          .insert([configData])
          .select()
          .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Return data with registration_timestamp
    return NextResponse.json({
      ...data,
      registration_timestamp: data?.created_at
    });
  } catch (error) {
    console.error('Error saving config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save config' },
      { status: 500 }
    );
  }
} 