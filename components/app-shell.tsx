"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Leaf, Menu } from "lucide-react";

import { adminNavItem, appNavGroups, type AppNavGroup } from "@/lib/app-nav";
import type { EnabledModules } from "@/lib/types/modules";
import { DEFAULT_ENABLED_MODULES } from "@/lib/types/modules";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AppBuildLabel } from "@/components/app-version-guard";
import { LogoutButton } from "@/components/auth/logout-button";
import { AppShellUserGreeting } from "@/components/app-shell-user-greeting";
import { cn } from "@/lib/utils";

/** Filtra os grupos de acordo com os módulos habilitados e role de admin. */
function buildVisibleGroups(
  enabledModules: EnabledModules,
  showAdminNav: boolean,
): AppNavGroup[] {
  const filtered = appNavGroups
    .filter(
      (group) =>
        !group.moduleGate || enabledModules[group.moduleGate] === true,
    )
    .filter((group) => group.items.length > 0);

  if (showAdminNav) {
    const sistemaIdx = filtered.findIndex((g) => g.label === "Sistema");
    const adminGroup: AppNavGroup = {
      label: "Sistema",
      items: [adminNavItem],
    };
    if (sistemaIdx >= 0) {
      // Adiciona item de admin dentro do grupo Sistema
      return filtered.map((g, i) =>
        i === sistemaIdx
          ? { ...g, items: [...g.items, adminNavItem] }
          : g,
      );
    }
    return [...filtered, adminGroup];
  }

  return filtered;
}

function NavGroups({
  onNavigate,
  className,
  showAdminNav,
  enabledModules,
}: {
  onNavigate?: () => void;
  className?: string;
  showAdminNav?: boolean;
  enabledModules: EnabledModules;
}) {
  const pathname = usePathname();
  const groups = buildVisibleGroups(enabledModules, showAdminNav ?? false);

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
              const active =
                pathname === item.href ||
                (item.href !== "/inicio" &&
                  pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex min-h-9 min-w-0 items-center gap-3 rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150",
                    "max-lg:min-h-10 max-lg:py-2 [@media(pointer:coarse)]:min-h-10 [@media(pointer:coarse)]:py-2",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                  )}
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
  enabledModules = DEFAULT_ENABLED_MODULES,
}: {
  children: React.ReactNode;
  showAdminNav?: boolean;
  userFirstName?: string | null;
  enabledModules?: EnabledModules;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-background flex min-h-screen w-full max-w-full overflow-x-clip">
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
            href="/inicio"
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
          enabledModules={enabledModules}
        />

        <Separator className="bg-sidebar-border opacity-40" />

        <div className="p-2">
          <LogoutButton className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring" />
          <AppBuildLabel className="text-sidebar-foreground/45" />
        </div>
      </aside>

      <div className="flex min-h-screen min-w-0 w-full max-w-full flex-1 flex-col overflow-x-clip lg:pl-60">
        {/* Header mobile / tablet */}
        <header
          className="border-border bg-background/95 supports-backdrop-filter:bg-background/80 flex h-14 items-center gap-3 border-b px-4 backdrop-blur lg:hidden"
          role="banner"
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Abrir menu de navegação"
            aria-expanded={menuOpen}
            aria-controls="menu-navegacao-mobile"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Leaf className="text-primary size-4 shrink-0" aria-hidden />
            <span className="font-heading font-semibold">NutriGestão</span>
          </div>
        </header>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            id="menu-navegacao-mobile"
            side="left"
            closeButtonClassName="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring"
            className="border-sidebar-border bg-sidebar text-sidebar-foreground flex w-72 max-w-[min(18rem,100vw)] flex-col gap-0 overflow-x-hidden border-r p-0 shadow-lg"
          >
            <SheetTitle className="sr-only">Menu de navegação NutriGestão</SheetTitle>

            <div className="flex h-14 items-center gap-2 pr-12 pl-4">
              <Leaf className="text-sidebar-primary size-5 shrink-0" aria-hidden />
              <Link
                href="/inicio"
                onClick={() => setMenuOpen(false)}
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
              enabledModules={enabledModules}
              onNavigate={() => setMenuOpen(false)}
            />

            <Separator className="bg-sidebar-border opacity-40" />

            <div className="p-2">
              <LogoutButton className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring" />
              <AppBuildLabel className="text-sidebar-foreground/45" />
            </div>
          </SheetContent>
        </Sheet>

        <main
          id="conteudo-principal"
          className="min-w-0 max-w-full flex-1 overflow-x-clip p-4 md:p-6"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
