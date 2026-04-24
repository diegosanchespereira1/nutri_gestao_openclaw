"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Leaf, Menu } from "lucide-react";

import { adminNavItem, appNavItems } from "@/lib/app-nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { LogoutButton } from "@/components/auth/logout-button";
import { AppShellUserGreeting } from "@/components/app-shell-user-greeting";
import { cn } from "@/lib/utils";

function NavLinks({
  onNavigate,
  className,
  showAdminNav,
}: {
  onNavigate?: () => void;
  className?: string;
  showAdminNav?: boolean;
}) {
  const pathname = usePathname();
  const items = showAdminNav ? [...appNavItems, adminNavItem] : appNavItems;

  return (
    <nav
      className={cn("flex flex-col gap-0.5 px-2 py-2", className)}
      aria-label="Navegação principal"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href ||
          (item.href !== "/inicio" && pathname.startsWith(`${item.href}/`));

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
              "max-lg:min-h-11 max-lg:py-3 [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:py-3",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon
              className={cn(
                "size-4 shrink-0 transition-opacity",
                active ? "opacity-100" : "opacity-70",
              )}
              aria-hidden
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  children,
  showAdminNav = false,
}: {
  children: React.ReactNode;
  showAdminNav?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="bg-background flex min-h-screen">
      <a
        href="#conteudo-principal"
        className="bg-primary text-primary-foreground focus:ring-ring sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:ring-2"
      >
        Saltar para conteúdo
      </a>

      {/* Sidebar dark fixa — ≥ lg (1024px) */}
      <aside
        className="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r shadow-lg lg:flex"
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

        <AppShellUserGreeting />

        <Separator className="bg-sidebar-border opacity-40" />

        <NavLinks
          className="min-h-0 flex-1 overflow-y-auto"
          showAdminNav={showAdminNav}
        />

        <Separator className="bg-sidebar-border opacity-40" />

        <div className="p-2">
          <LogoutButton className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring" />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-60">
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
            className="border-sidebar-border bg-sidebar text-sidebar-foreground flex w-72 flex-col gap-0 border-r p-0 shadow-lg"
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

            <AppShellUserGreeting />

            <Separator className="bg-sidebar-border opacity-40" />

            <NavLinks
              className="min-h-0 flex-1 overflow-y-auto"
              showAdminNav={showAdminNav}
              onNavigate={() => setMenuOpen(false)}
            />

            <Separator className="bg-sidebar-border opacity-40" />

            <div className="p-2">
              <LogoutButton className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-sidebar-ring" />
            </div>
          </SheetContent>
        </Sheet>

        <main
          id="conteudo-principal"
          className="flex-1 p-4 md:p-6"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
