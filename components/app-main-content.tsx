"use client";

type Props = {
  children: React.ReactNode;
};

/**
 * Área de conteúdo — sem overlay global de navegação.
 * Cada página usa Suspense/skeleton local (mais rápido e sem bloquear segundos).
 */
export function AppMainContent({ children }: Props) {
  return <div className="relative w-full">{children}</div>;
}
