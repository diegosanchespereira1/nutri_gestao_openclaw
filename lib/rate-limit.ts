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
 * Rate limiter para pedido público de exclusão de conta (3 por hora por email)
 */
export const accountClosureRequestRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(3, '1 h'),
  analytics: true,
  prefix: 'ratelimit:account-closure',
});

export const accountClosureIpRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(5, '1 h'),
  analytics: true,
  prefix: 'ratelimit:account-closure-ip',
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

/** Fail-closed quando Redis/Upstash está indisponível. */
function rateLimitUnavailable(retryAfterSeconds: number) {
  return {
    success: false,
    remaining: 0,
    reset: Date.now() + retryAfterSeconds * 1000,
    retryAfter: retryAfterSeconds,
  };
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
    return rateLimitUnavailable(60);
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
    return rateLimitUnavailable(3600);
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
    return rateLimitUnavailable(60);
  }
}

function getClientIpFromHeaders(forwarded: string | null, realIp: string | null): string {
  return (
    (forwarded ? forwarded.split(',')[0].trim() : null) ||
    realIp ||
    'unknown'
  );
}

/**
 * Rate limit para pedido público de exclusão de conta (email + IP).
 */
export async function checkAccountClosureRequestRateLimit(
  email: string,
  ip: string,
) {
  try {
    const [emailLimit, ipLimit] = await Promise.all([
      accountClosureRequestRatelimit.limit(`closure:${email.toLowerCase().trim()}`),
      accountClosureIpRatelimit.limit(`closure-ip:${ip}`),
    ]);

    const success = emailLimit.success && ipLimit.success;
    const reset = Math.max(emailLimit.reset, ipLimit.reset);

    return {
      success,
      remaining: Math.min(emailLimit.remaining, ipLimit.remaining),
      reset,
      retryAfter: reset ? Math.ceil((reset - Date.now()) / 1000) : null,
    };
  } catch (error) {
    console.error('[Rate Limit Error]', error);
    return rateLimitUnavailable(3600);
  }
}

export { getClientIpFromHeaders };
