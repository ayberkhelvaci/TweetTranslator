import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Make sure to get the deployment URL from environment variable
const BASE_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const dynamic = 'force-dynamic'; // This is important for Vercel deployment

export async function GET(request: Request) {
  try {
    console.log('Auth callback initiated', {
      url: request.url,
      baseUrl: BASE_URL,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      vercelUrl: process.env.VERCEL_URL
    });

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    console.log('Auth callback parameters:', {
      hasCode: !!code,
      hasState: !!state,
      fullParams: Object.fromEntries(searchParams.entries())
    });

    if (!code || !state) {
      console.error('Missing required parameters:', { code, state });
      return NextResponse.redirect(`${BASE_URL}/auth/error?error=missing_params`);
    }

    // Your callback logic here
    console.log('Auth callback successful, redirecting to:', BASE_URL);
    return NextResponse.redirect(`${BASE_URL}`);
  } catch (error) {
    console.error('Auth callback error:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      url: request.url,
      baseUrl: BASE_URL
    });
    return NextResponse.redirect(`${BASE_URL}/auth/error?error=callback_failed`);
  }
} 