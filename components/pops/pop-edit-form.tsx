"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deletePopAction, savePopNewVersionAction } from "@/lib/actions/pops";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  popId: string;
  establishmentId: string;
  initialTitle: string;
  initialBody: string;
  currentVersionNumber: number;
};

export function PopEditForm({
  popId,
  establishmentId,
  initialTitle,
  initialBody,
  currentVersionNumber,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    startTransition(async () => {
      const res = await savePopNewVersionAction({ popId, title, body });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.unchanged) {
        setInfo(
          `Nenhuma alteração detectada. Mantém-se a versão ${res.versionNumber} — não foi criada uma nova entrada no histórico.`,
        );
        return;
      }
      router.refresh();
    });
  }

  function onDelete() {
    if (
      !window.confirm(
        "Eliminar este POP e todo o histórico de versões? Não pode ser anulado.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deletePopAction(popId);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      router.replace(`/pops/estabelecimento/${establishmentId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSave} className="space-y-6">
      <p className="text-muted-foreground text-sm">
        Versão atual na edição:{" "}
        <span className="text-foreground font-medium tabular-nums">
          {currentVersionNumber}
        </span>
        . Ao salvar, só é criada uma{" "}
        <span className="text-foreground font-medium">nova versão</span> se o
        título ou o conteúdo tiverem mudado em relação a esta versão (histórico
        em «Versões»).
      </p>

      <div className="space-y-2">
        <Label htmlFor="pop-title">Título do POP</Label>
        <Input
          id="pop-title"
          value={title}
          onChange={(e) => {
            setInfo(null);
            setTitle(e.target.value);
          }}
          required
          maxLength={300}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="pop-body">Conteúdo</Label>
        <textarea
          id="pop-body"
          value={body}
          onChange={(e) => {
            setInfo(null);
            setBody(e.target.value);
          }}
          required
          rows={18}
          className="border-input bg-background text-foreground focus-visible:ring-ring min-h-[280px] w-full rounded-lg border px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        />
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p
          className="border-primary/35 bg-primary/10 text-foreground rounded-lg border px-3 py-2 text-sm"
          role="status"
        >
          {info}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar nova versão"}
        </Button>
        <Link
          href={`/pops/${popId}/historico`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Versões anteriores
        </Link>
        <Link
          href={`/pops/${popId}/pdf`}
          className={cn(buttonVariants({ variant: "outline" }))}
          target="_blank"
          rel="noopener noreferrer"
        >
          Exportar PDF
        </Link>
        <Link
          href={`/pops/estabelecimento/${establishmentId}`}
          className={cn(buttonVariants({ variant: "ghost" }))}
        >
          Voltar
        </Link>
        <Button
          type="button"
          variant="ghost"
          className="text-destructive hover:text-destructive ml-auto"
          disabled={pending}
          onClick={onDelete}
        >
          Eliminar POP
        </Button>
      </div>
    </form>
  );
}
