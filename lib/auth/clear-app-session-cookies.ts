import {
  APP_PROFILE_CTX_COOKIE,
  APP_SESSION_LAST_COOKIE,
  APP_SESSION_START_COOKIE,
} from "@/lib/auth/app-session-cookies";

export function clearAppSessionCookies(cookieStore: {
  delete: (name: string) => void;
}): void {
  cookieStore.delete(APP_SESSION_START_COOKIE);
  cookieStore.delete(APP_SESSION_LAST_COOKIE);
  cookieStore.delete(APP_PROFILE_CTX_COOKIE);
}
