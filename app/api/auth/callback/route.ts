import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      return NextResponse.redirect('/auth/error?error=missing_params');
    }

    // Your callback logic here

    return NextResponse.redirect('/');
  } catch (error) {
    console.error('Callback error:', error);
    return NextResponse.redirect('/auth/error?error=callback_failed');
  }
} 