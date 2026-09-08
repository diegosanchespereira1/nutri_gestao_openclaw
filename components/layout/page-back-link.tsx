import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";

export const pageBackLinkClassName = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "gap-1.5",
);

type PageBackLinkProps = {
  href: string;
  label: ReactNode;
  className?: string;
};

/** Voltar hierárquico do DS 2.0 — outline + seta, nunca primário. */
export function PageBackLink({ href, label, className }: PageBackLinkProps) {
  return (
    <Link href={href} className={cn(pageBackLinkClassName, className)}>
      <ArrowLeft className="size-3.5" aria-hidden />
      {label}
    </Link>
  );
}
