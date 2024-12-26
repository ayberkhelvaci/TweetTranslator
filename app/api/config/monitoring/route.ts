import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { data: config, error } = await supabaseAdmin
      .from('config')
      .select('source_account, check_interval')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json(config || {});
  } catch (error) {
    console.error('Error fetching monitoring config:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch configuration'
      },
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
    const { sourceAccount, checkInterval } = body;

    if (!sourceAccount || !checkInterval) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update only monitoring-related fields
    const { error: updateError } = await supabaseAdmin
      .from('config')
      .upsert({
        user_id: session.user.id,
        source_account: sourceAccount,
        check_interval: checkInterval,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id',
      });

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      message: 'Monitoring configuration updated'
    });
  } catch (error) {
    console.error('Error updating monitoring config:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to update configuration'
      },
      { status: 500 }
    );
  }
} 