/**
 * Rate limiting utilities using Upstash Redis
 * Protects against brute force attacks
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest } from 'next/server';

// Create Ratelimit instance
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

/**
 * Rate limiter para login/signup (5 tentativas por minuto por IP)
 */
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, '1 m'),
  analytics: true,
  prefix: 'ratelimit:auth',
});

/**
 * Rate limiter para password reset (3 por hora por email)
 */
export const passwordResetRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, '1 h'),
  analytics: true,
  prefix: 'ratelimit:password-reset',
});

/**
 * Rate limiter para API calls (100 por minuto por usuário)
 */
export const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(100, '1 m'),
  analytics: true,
  prefix: 'ratelimit:api',
});

/**
 * Extrai IP do request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  return (
    (forwarded ? forwarded.split(',')[0].trim() : null) ||
    realIp ||
    'unknown'
  );
}

/**
 * Check auth rate limit (for login/signup)
 * Returns { success, remaining, reset, retryAfter }
 */
export async function checkAuthRateLimit(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const { success, remaining, reset } = await authRatelimit.limit(ip);
    return {
      success,
      remaining,
      reset,
      retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : null,
    };
  } catch (error) {
    console.error('[Rate Limit Error]', error);
    // Graceful degradation: allow request if Redis is down
    return {
      success: true,
      remaining: 4,
      reset: Date.now() + 60000,
      retryAfter: null,
    };
  }
}

/**
 * Check password reset rate limit
 */
export async function checkPasswordResetRateLimit(email: string) {
  try {
    const { success, remaining, reset } = await passwordResetRatelimit.limit(
      `pwd-reset:${email}`
    );
    return {
      success,
      remaining,
      reset,
      retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : null,
    };
  } catch (error) {
    console.error('[Rate Limit Error]', error);
    return {
      success: true,
      remaining: 2,
      reset: Date.now() + 3600000,
      retryAfter: null,
    };
  }
}

/**
 * Check API rate limit (for authenticated users)
 */
export async function checkApiRateLimit(userId: string) {
  try {
    const { success, remaining, reset } = await apiRatelimit.limit(
      `api:${userId}`
    );
    return {
      success,
      remaining,
      reset,
      retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : null,
    };
  } catch (error) {
    console.error('[Rate Limit Error]', error);
    return {
      success: true,
      remaining: 99,
      reset: Date.now() + 60000,
      retryAfter: null,
    };
  }
}
