// Portal layout — acesso externo controlado por magic link token.
// Não usa o AppShell do profissional: UI simplificada, sem sidebar.

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background min-h-screen">
      <header className="border-border border-b px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <span className="text-foreground text-base font-semibold">
            NutriGestão
          </span>
          <span className="text-muted-foreground text-xs">Portal</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
