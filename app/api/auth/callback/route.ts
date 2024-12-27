import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// Make sure to get the deployment URL from environment variable
const BASE_URL = process.env.NEXTAUTH_URL || process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:3000';

export const dynamic = 'force-dynamic'; // This is important for Vercel deployment

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect(`${BASE_URL}/auth/error?error=missing_params`);
    }

    // Your callback logic here

    return NextResponse.redirect(`${BASE_URL}`);
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect(`${BASE_URL}/auth/error?error=callback_failed`);
  }
} 