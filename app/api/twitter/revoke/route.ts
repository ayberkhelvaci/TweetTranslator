import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST() {
  try {
    // Delete the Twitter API keys from the database
    const { error } = await supabaseAdmin
      .from('twitter_keys')
      .delete()
      .neq('id', 0); // Delete all records

    if (error) {
      console.error('Error revoking Twitter tokens:', error);
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in revoke endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to revoke Twitter tokens' },
      { status: 500 }
    );
  }
} 