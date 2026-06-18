import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getAppSessionAbsoluteMaxSec,
  getAppSessionIdleTimeoutSec,
} from "./app-session-cookies";

describe("app-session-cookies", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("usa defaults quando env está vazio", () => {
    vi.stubEnv("AUTH_SESSION_ABSOLUTE_MAX_SEC", "");
    vi.stubEnv("AUTH_SESSION_IDLE_TIMEOUT_SEC", "");
    expect(getAppSessionAbsoluteMaxSec()).toBe(8 * 60 * 60);
    expect(getAppSessionIdleTimeoutSec()).toBe(45 * 60);
  });

  it("honra valores numéricos válidos", () => {
    vi.stubEnv("AUTH_SESSION_ABSOLUTE_MAX_SEC", "3600");
    vi.stubEnv("AUTH_SESSION_IDLE_TIMEOUT_SEC", "120");
    expect(getAppSessionAbsoluteMaxSec()).toBe(3600);
    expect(getAppSessionIdleTimeoutSec()).toBe(120);
  });

  it("rejeita valores abaixo do mínimo", () => {
    vi.stubEnv("AUTH_SESSION_ABSOLUTE_MAX_SEC", "10");
    vi.stubEnv("AUTH_SESSION_IDLE_TIMEOUT_SEC", "0");
    expect(getAppSessionAbsoluteMaxSec()).toBe(8 * 60 * 60);
    expect(getAppSessionIdleTimeoutSec()).toBe(45 * 60);
  });

  it("usa defaults longos para app nativo", () => {
    vi.stubEnv("AUTH_SESSION_MOBILE_ABSOLUTE_MAX_SEC", "");
    vi.stubEnv("AUTH_SESSION_MOBILE_IDLE_TIMEOUT_SEC", "");
    const yearSec = 365 * 24 * 60 * 60;
    expect(getAppSessionAbsoluteMaxSec({ nativeClient: true })).toBe(yearSec);
    expect(getAppSessionIdleTimeoutSec({ nativeClient: true })).toBe(yearSec);
  });

  it("honra env mobile específico", () => {
    vi.stubEnv("AUTH_SESSION_MOBILE_ABSOLUTE_MAX_SEC", "604800");
    vi.stubEnv("AUTH_SESSION_MOBILE_IDLE_TIMEOUT_SEC", "86400");
    expect(getAppSessionAbsoluteMaxSec({ nativeClient: true })).toBe(604_800);
    expect(getAppSessionIdleTimeoutSec({ nativeClient: true })).toBe(86_400);
  });
});
