"use client";

import { createContext, useContext } from "react";

import {
  DEFAULT_PROFILE_TIME_ZONE,
  normalizeAppTimeZone,
} from "@/lib/timezones";

const AppTimeZoneContext = createContext<string>(DEFAULT_PROFILE_TIME_ZONE);

export function AppTimeZoneProvider({
  timeZone,
  children,
}: {
  timeZone: string;
  children: React.ReactNode;
}) {
  const tz = normalizeAppTimeZone(timeZone);
  return (
    <AppTimeZoneContext.Provider value={tz}>
      {children}
    </AppTimeZoneContext.Provider>
  );
}

export function useAppTimeZone(): string {
  return useContext(AppTimeZoneContext);
}
