"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { ModuleDisabledDialog } from "@/components/modules/module-disabled-dialog";
import type { EnabledModuleKey, EnabledModules } from "@/lib/types/modules";
import { DEFAULT_ENABLED_MODULES } from "@/lib/types/modules";

type ModuleGateContextValue = {
  enabledModules: EnabledModules;
  isModuleEnabled: (moduleKey: EnabledModuleKey) => boolean;
  openDisabledModule: (moduleKey: EnabledModuleKey) => void;
};

const ModuleGateContext = createContext<ModuleGateContextValue | null>(null);

export function ModuleGateProvider({
  enabledModules = DEFAULT_ENABLED_MODULES,
  children,
}: {
  enabledModules?: EnabledModules;
  children: ReactNode;
}) {
  const [blockedModule, setBlockedModule] = useState<EnabledModuleKey | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const openDisabledModule = useCallback((moduleKey: EnabledModuleKey) => {
    setBlockedModule(moduleKey);
    setDialogOpen(true);
  }, []);

  const value = useMemo<ModuleGateContextValue>(
    () => ({
      enabledModules,
      isModuleEnabled: (moduleKey) => enabledModules[moduleKey] === true,
      openDisabledModule,
    }),
    [enabledModules, openDisabledModule],
  );

  return (
    <ModuleGateContext.Provider value={value}>
      {children}
      <ModuleDisabledDialog
        moduleKey={blockedModule}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setBlockedModule(null);
        }}
      />
    </ModuleGateContext.Provider>
  );
}

export function useModuleGate(): ModuleGateContextValue {
  const ctx = useContext(ModuleGateContext);
  if (!ctx) {
    throw new Error("useModuleGate must be used within ModuleGateProvider");
  }
  return ctx;
}
