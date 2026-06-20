import { NextResponse } from "next/server";

import { getServerAppVersion } from "@/lib/app-version-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  const version = getServerAppVersion();
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
