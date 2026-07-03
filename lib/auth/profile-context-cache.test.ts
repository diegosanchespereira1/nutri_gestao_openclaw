import { describe, expect, it } from "vitest";

import { shouldReuseProfileContextCache } from "./profile-context-cache";
import { APP_DASHBOARD_PATH } from "@/lib/routes";
import { DEFAULT_ENABLED_MODULES } from "@/lib/types/modules";

const baseCached = {
  userId: "user-1",
  workspaceOwnerId: "user-1",
  role: null,
  timeZone: "America/Sao_Paulo",
  fullName: null,
  lgpdBlocked: false,
  needsOnboarding: true,
  cachedAt: 1_000,
  enabledModules: DEFAULT_ENABLED_MODULES,
} as const;

describe("shouldReuseProfileContextCache", () => {
  const nowSec = 1_100;
  const ttlSec = 300;

  it("reutiliza cache válido", () => {
    expect(
      shouldReuseProfileContextCache({
        isNewAppSession: false,
        cached: { ...baseCached, needsOnboarding: false },
        userId: "user-1",
        nowSec,
        ttlSec,
        pathname: "/clientes",
        bemvindoParam: null,
      }),
    ).toBe(true);
  });

  it("invalida após onboarding com bemvindo=1", () => {
    expect(
      shouldReuseProfileContextCache({
        isNewAppSession: false,
        cached: baseCached,
        userId: "user-1",
        nowSec,
        ttlSec,
        pathname: APP_DASHBOARD_PATH,
        bemvindoParam: "1",
      }),
    ).toBe(false);
  });

  it("invalida dashboard quando cache ainda marca needsOnboarding", () => {
    expect(
      shouldReuseProfileContextCache({
        isNewAppSession: false,
        cached: baseCached,
        userId: "user-1",
        nowSec,
        ttlSec,
        pathname: APP_DASHBOARD_PATH,
        bemvindoParam: null,
      }),
    ).toBe(false);
  });
});
