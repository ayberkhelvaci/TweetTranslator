import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  try {
    console.log('Checking API status...');
    
    // Check OpenAI key from environment
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;
    
    console.log('OpenAI key check:', {
      hasKey: hasOpenAIKey
    });

    // Check Twitter keys
    const { data: twitterKeys, error: twitterKeysError } = await supabaseAdmin
      .from('twitter_keys')
      .select('api_key, api_secret, access_token, access_token_secret')
      .single();

    console.log('Twitter keys check:', {
      hasKeys: !!twitterKeys,
      error: twitterKeysError
    });

    const hasTwitterKeys = !twitterKeysError && twitterKeys !== null;

    console.log('Final status check:', {
      hasOpenAIKey,
      hasTwitterKeys
    });

    if (!hasTwitterKeys || !hasOpenAIKey) {
      return NextResponse.json({
        success: true,
        status: 'missing',
        details: {
          hasTwitterKeys,
          hasOpenAIKey
        }
      });
    }

    // All keys are present
    return NextResponse.json({
      success: true,
      status: 'active'
    });

  } catch (error) {
    console.error('Error checking API status:', error);
    return NextResponse.json({
      success: false,
      status: 'needs_update',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 