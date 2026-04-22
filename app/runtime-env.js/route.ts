import { NextResponse } from "next/server";

import { getPublicRuntimeEnv } from "@/lib/env/public-runtime";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  const env = getPublicRuntimeEnv();
  const body = `window.__NUTRIGESTAO_PUBLIC_ENV__=${JSON.stringify(env).replace(
    /</g,
    "\\u003c",
  )};`;

  return new NextResponse(body, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      pragma: "no-cache",
      expires: "0",
    },
  });
}
