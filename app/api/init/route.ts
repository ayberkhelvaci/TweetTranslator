import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/options';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.error('No session or user ID found');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has config
    const { data: existingConfig, error: configError } = await supabase
      .from('config')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (configError && configError.code !== 'PGRST116') {
      console.error('Config error:', configError);
      return NextResponse.json(
        { error: 'Failed to check configuration' },
        { status: 500 }
      );
    }

    // If no config exists, create default config
    if (!existingConfig) {
      const { error: insertError } = await supabase
        .from('config')
        .insert({
          user_id: session.user.id,
          source_account: session.user.twitter_username || '',
          target_language: 'en',
          check_interval: 5
        });

      if (insertError) {
        console.error('Error initializing database:', insertError);
        return NextResponse.json(
          { error: 'Failed to initialize database' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
} 