"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";

import { adminNavItem, appNavItems } from "@/lib/app-nav";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LogoutButton } from "@/components/auth/logout-button";
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
      className={cn("flex flex-col gap-0.5 p-2", className)}
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
              "flex items-center gap-2 rounded-lg border-l-[3px] px-3 py-2 text-sm font-medium transition-colors",
              "focus-visible:ring-ring outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              active
                ? "bg-primary/10 border-primary text-foreground font-semibold"
                : "text-foreground/85 border-transparent hover:bg-muted/70",
            )}
          >
            <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
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

      {/* Sidebar fixa — viewport ≥ lg (1024px), alinhado ao UX spec */}
      <aside
        className="border-sidebar-border bg-sidebar text-sidebar-foreground fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r lg:flex"
        aria-label="Barra lateral"
      >
        <div className="flex h-14 items-center px-4">
          <Link
            href="/inicio"
            className="text-sidebar-foreground font-heading text-base font-semibold tracking-tight"
          >
            NutriGestão
          </Link>
        </div>
        <Separator className="bg-sidebar-border" />
        <NavLinks
          className="min-h-0 flex-1 overflow-y-auto"
          showAdminNav={showAdminNav}
        />
        <Separator className="bg-sidebar-border" />
        <div className="p-2">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col lg:pl-60">
        {/* Cabeçalho mobile / tablet: menu em Sheet (&lt; lg). Em &lt;768px cumpre AC explícito; &lt;lg mantém mesmo padrão UX tablet. */}
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
          <span className="font-heading font-semibold">NutriGestão</span>
        </header>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent
            id="menu-navegacao-mobile"
            side="left"
            className="flex w-72 flex-col p-0"
          >
            <SheetHeader className="border-border border-b p-4 text-left">
              <SheetTitle className="font-heading">Menu</SheetTitle>
              <SheetDescription className="sr-only">
                Navegação principal da aplicação
              </SheetDescription>
            </SheetHeader>
            <NavLinks
              className="min-h-0 flex-1 overflow-y-auto"
              showAdminNav={showAdminNav}
              onNavigate={() => setMenuOpen(false)}
            />
            <Separator className="bg-border" />
            <div className="p-2">
              <LogoutButton />
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
