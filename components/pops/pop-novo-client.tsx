"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createBlankPopAction,
  createPopFromTemplateAction,
} from "@/lib/actions/pops";
import type { PopTemplateRow } from "@/lib/types/pops";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  establishmentId: string;
  templates: PopTemplateRow[];
};

export function PopNovoClient({ establishmentId, templates }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [blankTitle, setBlankTitle] = useState("");

  function applyTemplate(templateId: string) {
    setError(null);
    startTransition(async () => {
      const res = await createPopFromTemplateAction({
        establishmentId,
        templateId,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/pops/${res.popId}/editar`);
    });
  }

  function createBlank(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createBlankPopAction({
        establishmentId,
        title: blankTitle,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/pops/${res.popId}/editar`);
    });
  }

  return (
    <div className="space-y-10">
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-foreground text-lg font-semibold">
          Modelos para este tipo de estabelecimento
        </h2>
        {templates.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nenhum modelo disponível.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <li
                key={t.id}
                className="bg-card ring-foreground/10 flex flex-col gap-2 rounded-xl p-4 ring-1"
              >
                <p className="text-foreground font-medium">{t.name}</p>
                {t.description ? (
                  <p className="text-muted-foreground text-sm">{t.description}</p>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  className="mt-auto w-fit"
                  disabled={pending}
                  onClick={() => applyTemplate(t.id)}
                >
                  Usar este modelo
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-border space-y-4 border-t pt-8">
        <h2 className="text-foreground text-lg font-semibold">
          Documento em branco
        </h2>
        <form onSubmit={createBlank} className="max-w-md space-y-4">
          <div className="space-y-2">
            <Label htmlFor="blank-title">Título do POP</Label>
            <Input
              id="blank-title"
              value={blankTitle}
              onChange={(e) => setBlankTitle(e.target.value)}
              placeholder="Ex.: Higienização da cozinha"
              required
              maxLength={300}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "A criar…" : "Criar e editar"}
            </Button>
            <Link
              href={`/pops/estabelecimento/${establishmentId}`}
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Cancelar
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
