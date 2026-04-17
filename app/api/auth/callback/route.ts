/**
 * Supabase Auth Callback Handler
 * Handles OAuth and magic link callbacks
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { checkAuthRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/inicio';

  // Rate limit callback attempts (abuse prevention)
  const rateLimitResult = await checkAuthRateLimit(request);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: 'Demasiadas tentativas. Tente novamente em ' +
               (rateLimitResult.retryAfter || 60) + ' segundos.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 60),
        },
      }
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/auth/login?error=no_code', request.url)
    );
  }

  const supabase = await createClient();

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('[Auth Callback Error]', error);
      return NextResponse.redirect(
        new URL(
          `/auth/login?error=${encodeURIComponent(error.message)}`,
          request.url
        )
      );
    }

    return NextResponse.redirect(new URL(next, request.url));
  } catch (error) {
    console.error('[Auth Callback Exception]', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=callback_failed', request.url)
    );
  }
}
