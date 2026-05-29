import { NextResponse } from "next/server";

import { getAppVersion } from "@/lib/app-version";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  const version = getAppVersion();
  return NextResponse.json(
    { version },
    {
      headers: {
        "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        pragma: "no-cache",
        expires: "0",
      },
    },
  );
}
