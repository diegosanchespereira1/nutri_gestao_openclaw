import { NextResponse } from "next/server";

import { getAppBuildId } from "@/lib/app-build";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  return NextResponse.json(
    { buildId: getAppBuildId() },
    {
      headers: {
        "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        pragma: "no-cache",
        expires: "0",
      },
    },
  );
}
