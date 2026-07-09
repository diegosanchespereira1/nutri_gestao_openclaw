import Link from "next/link";
import type { ReactNode } from "react";

type PublicLegalPageShellProps = {
  title: string;
  subtitle?: string;
  badge?: string;
  children: ReactNode;
};

export function PublicLegalPageShell({
  title,
  subtitle,
  badge = "LGPD — Lei nº 13.709/2018",
  children,
}: PublicLegalPageShellProps) {
  return (
    <div className="min-h-screen bg-[hsl(165_25%_97%)]">
      <header className="sticky top-0 z-10 border-b border-[hsl(173_45%_16%)] bg-[hsl(173_60%_10%)]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/login" className="group flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-[hsl(168_25%_88%)]">
              Nutri<span className="text-[hsl(173_60%_36%)]">Gestão</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-xs text-[hsl(168_10%_60%)]">
            <Link href="/politica-de-privacidade" className="hover:underline">
              Privacidade
            </Link>
            <Link href="/login" className="hover:underline">
              Entrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12 pb-24">
        <div className="mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[hsl(173_60%_36%_/_0.12)] px-3 py-1 text-xs font-medium text-[hsl(173_72%_28%)]">
            <span aria-hidden>⚖️</span> {badge}
          </div>
          <h1 className="mb-3 text-3xl font-bold text-[hsl(172_46%_10%)]">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-base leading-relaxed text-[hsl(168_10%_45%)]">
              {subtitle}
            </p>
          ) : null}
        </div>

        {children}
      </main>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[hsl(168_22%_85%)] bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-[hsl(172_46%_10%)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

export { SectionCard };
