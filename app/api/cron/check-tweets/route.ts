import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { fetchTweetsManually } from '../../../../lib/services/configService';

interface ProcessResult {
  user_id: string;
  status: 'success' | 'error';
  message: string;
}

export async function POST(req: Request) {
  try {
    // Verify the secret token
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active configurations
    const { data: configs, error: configError } = await supabaseAdmin
      .from('config')
      .select('*');

    if (configError) {
      throw new Error('Failed to fetch configurations');
    }

    const results: ProcessResult[] = [];
    
    // Process each configuration
    for (const config of configs) {
      try {
        const result = await fetchTweetsManually(config.user_id);
        results.push({
          user_id: config.user_id,
          status: 'success',
          message: result.message
        });
      } catch (error) {
        results.push({
          user_id: config.user_id,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 