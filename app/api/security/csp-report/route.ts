/**
 * CSP Report URI endpoint — regista violações da Content-Security-Policy.
 * O formato do corpo varia entre browsers (JSON legacy, Reporting API, vazio).
 */

import { NextRequest, NextResponse } from "next/server";

type LegacyCspReportBody = {
  "csp-report"?: {
    "document-uri"?: string;
    "violated-directive"?: string;
    "effective-directive"?: string;
    "original-policy"?: string;
    disposition?: string;
    "blocked-uri"?: string;
    "source-file"?: string;
    "line-number"?: number;
    "column-number"?: number;
    "status-code"?: number;
  };
};

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (!raw.trim()) {
      return new NextResponse(null, { status: 204 });
    }

    let body: unknown;
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      return new NextResponse(null, { status: 204 });
    }

    const legacy = body as LegacyCspReportBody;
    const report = legacy["csp-report"];
    if (report) {
      console.error("[CSP Violation]", {
        timestamp: new Date().toISOString(),
        documentUri: report["document-uri"],
        violatedDirective: report["violated-directive"],
        effectiveDirective: report["effective-directive"],
        blockedUri: report["blocked-uri"],
        sourceFile: report["source-file"],
        lineNumber: report["line-number"],
        disposition: report.disposition,
      });
    } else {
      console.error("[CSP Violation] (formato não legacy)", {
        timestamp: new Date().toISOString(),
        preview: raw.slice(0, 500),
      });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[CSP Report Error]", error);
    return new NextResponse(null, { status: 204 });
  }
}
