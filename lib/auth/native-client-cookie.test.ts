import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import {
  isNativeClientRequest,
  NATIVE_CLIENT_COOKIE,
  NATIVE_CLIENT_COOKIE_VALUE,
} from "./native-client-cookie";

function requestWith(
  init: { cookie?: string; userAgent?: string; url?: string } = {},
): NextRequest {
  const headers = new Headers();
  if (init.userAgent) headers.set("user-agent", init.userAgent);
  if (init.cookie) headers.set("cookie", init.cookie);

  return new NextRequest(init.url ?? "https://nutricao.stratostech.com.br/dashboard", {
    headers,
  });
}

describe("isNativeClientRequest", () => {
  it("detecta cookie ng_native_client", () => {
    const req = requestWith({
      cookie: `${NATIVE_CLIENT_COOKIE}=${NATIVE_CLIENT_COOKIE_VALUE}`,
    });
    expect(isNativeClientRequest(req)).toBe(true);
  });

  it("detecta WebView Android", () => {
    const req = requestWith({
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36; wv)",
    });
    expect(isNativeClientRequest(req)).toBe(true);
  });

  it("não marca browser desktop", () => {
    const req = requestWith({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    expect(isNativeClientRequest(req)).toBe(false);
  });
});
