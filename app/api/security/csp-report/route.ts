/**
 * CSP Report URI endpoint — logs Content Security Policy violations
 * Called by browser when CSP policy is violated
 */

import { NextRequest, NextResponse } from 'next/server';

interface CSPReport {
  'csp-report': {
    'document-uri': string;
    'violated-directive': string;
    'effective-directive': string;
    'original-policy': string;
    'disposition': string;
    'blocked-uri'?: string;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
    'status-code'?: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: CSPReport = await request.json();
    const report = body['csp-report'];

    // Log CSP violation
    console.error('[CSP Violation]', {
      timestamp: new Date().toISOString(),
      documentUri: report['document-uri'],
      violatedDirective: report['violated-directive'],
      effectiveDirective: report['effective-directive'],
      blockedUri: report['blocked-uri'],
      sourceFile: report['source-file'],
      lineNumber: report['line-number'],
      disposition: report['disposition'],
    });

    // TODO: Send to external monitoring service (Sentry, DataDog, etc)
    // if (process.env.SENTRY_DSN) {
    //   captureException(new Error('CSP Violation'), { extra: report });
    // }

    return NextResponse.json(
      { message: 'CSP report received' },
      { status: 204 }
    );
  } catch (error) {
    console.error('[CSP Report Error]', error);
    return NextResponse.json(
      { error: 'Failed to process CSP report' },
      { status: 400 }
    );
  }
}
