"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Leaf } from "lucide-react";

import {
  buildVisibleNavGroups,
  isNavItemActive,
  resolveNavItemModuleGate,
} from "@/lib/app-nav";
import { APP_DASHBOARD_PATH } from "@/lib/routes";
import { useModuleGate } from "@/components/modules/module-gate-provider";
import { Separator } from "@/components/ui/separator";
import { AndroidTopInset } from "@/components/mobile/android-top-inset";
import { MobileBottomNav } from "@/components/mobile/mobile-bottom-nav";
import { AppMainContent } from "@/components/app-main-content";
import { AppRoutePrefetcher } from "@/components/app-route-prefetcher";
import { AppBuildLabel } from "@/components/app-version-guard";
import { LogoutButton } from "@/components/auth/logout-button";
import { AppShellUserGreeting } from "@/components/app-shell-user-greeting";
import { cn } from "@/lib/utils";

function NavGroups({
  onNavigate,
  className,
  showAdminNav,
}: {
  onNavigate?: () => void;
  className?: string;
  showAdminNav?: boolean;
}) {
  const pathname = usePathname();
  const { isModuleEnabled, openDisabledModule } = useModuleGate();
  const groups = buildVisibleNavGroups(showAdminNav ?? false);

  return (
    <nav
      className={cn("flex min-w-0 flex-col py-2", className)}
      aria-label="Navegação principal"
    >
      {groups.map((group, groupIdx) => (
        <div key={group.label}>
          {/* Separador entre grupos (não antes do primeiro) */}
          {groupIdx > 0 && (
            <Separator className="bg-sidebar-border/40 mx-3 my-1 w-auto" />
          )}

          {/* Label do grupo */}
          <p className="text-sidebar-foreground/40 mt-2 mb-0.5 px-4 text-[10px] font-semibold uppercase tracking-wide break-words leading-snug">
            {group.label}
          </p>

          {/* Itens do grupo */}
          <div className="min-w-0 px-2">
            {group.items.map((item) => {
              const Icon = item.icon;
              const moduleGate = resolveNavItemModuleGate(item, group);
              const isLocked =
                moduleGate !== null && !isModuleEnabled(moduleGate);
              const active =
                !isLocked &&
                isNavItemActive(pathname, item.href);

              const itemClassName = cn(
                "flex min-h-9 min-w-0 w-full items-center gap-3 rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors duration-150",
                "max-lg:min-h-10 max-lg:py-2 [@media(pointer:coarse)]:min-h-10 [@media(pointer:coarse)]:py-2",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                isLocked
                  ? "text-sidebar-foreground/55 hover:bg-sidebar-accent/40 cursor-pointer"
                  : active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
              );

              if (isLocked && moduleGate) {
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => {
                      openDisabledModule(moduleGate);
                      onNavigate?.();
                    }}
                    className={itemClassName}
                    aria-disabled="true"
                  >
                    <Icon
                      className="size-4 shrink-0 opacity-60"
                      aria-hidden
                    />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onClick={onNavigate}
                  className={itemClassName}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0 transition-opacity",
                      active ? "opacity-100" : "opacity-70",
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({
  children,
  showAdminNav = false,
  userFirstName = null,
}: {
  children: React.ReactNode;
  showAdminNav?: boolean;
  userFirstName?: string | null;
}) {
  return (
    <div className="bg-background flex min-h-screen w-full max-w-full overflow-x-hidden">
      <AppRoutePrefetcher />
      <a
        href="#conteudo-principal"
        className="bg-primary text-primary-foreground focus:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:ring-2"
      >
        Saltar para conteúdo
      </a>

      {/* Sidebar fixa — ≥ lg (1024px) */}
      <aside
        className="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-40 hidden w-60 max-w-60 flex-col overflow-x-hidden border-r shadow-lg lg:flex"
        aria-label="Barra lateral"
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 px-4">
          <Leaf className="text-sidebar-primary size-5 shrink-0" aria-hidden />
          <Link
            href={APP_DASHBOARD_PATH}
            prefetch
            className="text-sidebar-foreground font-heading text-base font-semibold tracking-tight"
          >
            NutriGestão
          </Link>
        </div>

        <Separator className="bg-sidebar-border opacity-40" />

        <AppShellUserGreeting firstName={userFirstName} />

        <Separator className="bg-sidebar-border opacity-40" />

        <NavGroups
          className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
          showAdminNav={showAdminNav}
        />

        <Separator className="bg-sidebar-border opacity-40" />

        <div className="p-2">
          <LogoutButton className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring" />
          <AppBuildLabel className="text-sidebar-foreground/45" />
          <Link
            href="/politica-de-privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sidebar-foreground/35 hover:text-sidebar-foreground/60 mt-1 block px-3 text-[10px] transition-colors"
          >
            Política de Privacidade
          </Link>
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden lg:pl-60">
        <AndroidTopInset className="shrink-0 lg:hidden" />
        {/* Header mobile / tablet */}
        <header
          className="border-border bg-background/95 supports-backdrop-filter:bg-background/80 flex min-h-14 shrink-0 items-center justify-center border-b px-4 backdrop-blur lg:hidden"
          role="banner"
        >
          <Link
            href={APP_DASHBOARD_PATH}
            prefetch
            className="flex items-center gap-2"
          >
            <Leaf className="text-primary size-4 shrink-0" aria-hidden />
            <span className="font-heading font-semibold">NutriGestão</span>
          </Link>
        </header>

        <main
          id="conteudo-principal"
          className="min-w-0 max-w-full flex-1 overflow-x-hidden p-4 pb-[calc(5.5rem+var(--safe-area-bottom))] md:p-6 lg:pb-6"
          tabIndex={-1}
        >
          <AppMainContent>{children}</AppMainContent>
        </main>

        <MobileBottomNav
          showAdminNav={showAdminNav}
          userFirstName={userFirstName}
        />
      </div>
    </div>
  );
}
