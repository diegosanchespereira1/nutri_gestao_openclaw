import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-background grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
      <div
        className="from-primary/15 via-background to-accent/20 text-foreground relative hidden flex-col items-center justify-center bg-gradient-to-br p-12 lg:flex"
        aria-hidden
      >
        <div className="max-w-sm text-center">
          <p className="text-primary font-heading text-3xl font-bold tracking-tight">
            NutriGestão
          </p>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            Autenticação segura por email e palavra-passe — alinhado ao produto
            (sem login social nesta fase).
          </p>
        </div>
      </div>
    </div>
  );
}
