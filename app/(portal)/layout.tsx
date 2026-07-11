// Portal layout — acesso externo controlado por magic link token.
// Não usa o AppShell do profissional: UI simplificada, sem sidebar.

import { AppPageScroll } from "@/components/app-page-scroll";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background flex min-h-screen flex-col md:min-h-0 md:h-screen">
      <header className="border-border shrink-0 border-b px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <span className="text-foreground text-base font-semibold">
            NutriGestão
          </span>
          <span className="text-muted-foreground text-xs">Portal</span>
        </div>
      </header>
      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col overflow-x-hidden px-4 py-8 md:overflow-hidden">
        <AppPageScroll>{children}</AppPageScroll>
      </main>
    </div>
  );
}
