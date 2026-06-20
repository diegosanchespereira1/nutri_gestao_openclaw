import { NextResponse } from "next/server";

import { getClientIpFromHeaders } from "@/lib/ip/client-ip-utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET(request: Request) {
  const ip = getClientIpFromHeaders(request.headers);
  return NextResponse.json(
    { ip },
    {
      headers: {
        "cache-control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        pragma: "no-cache",
        expires: "0",
      },
    },
  );
}
