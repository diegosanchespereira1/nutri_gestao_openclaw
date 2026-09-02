import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Página não encontrada | NutriGestão",
  description: "Erro 404 — a página solicitada não existe ou foi movida.",
};

export default function NotFound() {
  return (
    <main className="bg-background text-foreground flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="flex max-w-sm flex-col items-center text-center">
        <Image
          src="/app-logo-transparent.png"
          alt="NutriGestão"
          width={120}
          height={120}
          className="size-[120px] object-contain"
          priority
        />

        <p className="text-primary font-heading mt-6 text-2xl font-bold tracking-tight">
          NutriGestão
        </p>
        <p className="text-muted-foreground mt-1 text-[11px] tracking-[0.8px] uppercase">
          Gestão nutricional profissional
        </p>

        <p
          className="text-primary font-heading mt-10 text-6xl font-bold tracking-tight tabular-nums sm:text-7xl"
          aria-hidden
        >
          404
        </p>
        <h1 className="font-heading text-foreground mt-3 text-xl font-semibold tracking-tight">
          Página não encontrada
        </h1>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          O endereço que você acessou não existe ou foi movido. Verifique o link
          ou volte ao início.
        </p>

        <Link
          href="/"
          className={cn(buttonVariants({ variant: "default", size: "lg" }), "mt-8 min-w-[10rem]")}
        >
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
