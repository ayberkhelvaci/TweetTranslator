import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { saveConfiguration } from '@/lib/services/configService';

// GET configuration
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get configuration
    const { data: config, error } = await supabaseAdmin
      .from('config')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      console.error('Error fetching configuration:', error);
      return NextResponse.json(
        { error: 'Failed to fetch configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json(config || {});
  } catch (error) {
    console.error('Error in configuration endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST to update configuration
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
    console.log('Received configuration:', body);

    if (!body.source_account || !body.check_interval || !body.target_language) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Save configuration and fetch tweets
    const result = await saveConfiguration(session.user.id, {
      sourceAccount: body.source_account,
      checkInterval: body.check_interval,
      targetLanguage: body.target_language,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to save configuration' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Configuration saved successfully. Found ${result.tweetsFound} new tweets.`
    });
  } catch (error) {
    console.error('Error in configuration endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save configuration' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Delete configuration
    const { error: configError } = await supabaseAdmin
      .from('configurations')
      .delete()
      .eq('user_id', session.user.id);

    if (configError) {
      console.error('Error deleting configuration:', configError);
      return NextResponse.json(
        { error: 'Failed to delete configuration' },
        { status: 500 }
      );
    }

    // Delete associated tweets
    const { error: tweetsError } = await supabaseAdmin
      .from('tweets')
      .delete()
      .eq('user_id', session.user.id);

    if (tweetsError) {
      console.error('Error deleting tweets:', tweetsError);
      return NextResponse.json(
        { error: 'Failed to delete tweets' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Monitoring canceled successfully'
    });
  } catch (error) {
    console.error('Error in configuration endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 