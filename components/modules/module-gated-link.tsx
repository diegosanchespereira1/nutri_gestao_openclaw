"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useModuleGate } from "@/components/modules/module-gate-provider";
import { cn } from "@/lib/utils";
import type { EnabledModuleKey } from "@/lib/types/modules";

type Props = {
  href: string;
  moduleKey: EnabledModuleKey;
  children: ReactNode;
  className?: string;
};

export function ModuleGatedLink({
  href,
  moduleKey,
  children,
  className,
}: Props) {
  const { isModuleEnabled, openDisabledModule } = useModuleGate();

  if (isModuleEnabled(moduleKey)) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cn(className, "cursor-pointer")}
      onClick={() => openDisabledModule(moduleKey)}
    >
      {children}
    </button>
  );
}
