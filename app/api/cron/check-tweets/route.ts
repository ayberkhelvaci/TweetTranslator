import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';
import { fetchTweetsManually } from '../../../../lib/services/configService';
import crypto from 'crypto';

interface ProcessResult {
  user_id: string;
  status: 'success' | 'error';
  message: string;
}

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
        // Convert the user_id to UUID format before passing to fetchTweetsManually
        const userUUID = generateUUID(config.user_id);
        const result = await fetchTweetsManually(userUUID);
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