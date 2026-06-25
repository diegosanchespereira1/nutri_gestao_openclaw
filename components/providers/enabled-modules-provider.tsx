"use client";

import { createContext, useContext } from "react";

import {
  DEFAULT_ENABLED_MODULES,
  type EnabledModules,
} from "@/lib/types/modules";

const EnabledModulesContext =
  createContext<EnabledModules>(DEFAULT_ENABLED_MODULES);

export function EnabledModulesProvider({
  value,
  children,
}: {
  value: EnabledModules;
  children: React.ReactNode;
}) {
  return (
    <EnabledModulesContext.Provider value={value}>
      {children}
    </EnabledModulesContext.Provider>
  );
}

export function useEnabledModules(): EnabledModules {
  return useContext(EnabledModulesContext);
}
