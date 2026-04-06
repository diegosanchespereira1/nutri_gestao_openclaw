"use client";

import Link from "next/link";
import { useState } from "react";

import { loadPopWithVersionsAction } from "@/lib/actions/pops";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = { popId: string };

export function PopRowActions({ popId }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    title: string;
    body: string;
    version: number;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setPreview(null);
      setLoadError(null);
      setLoading(false);
    }
  }

  function startPreview() {
    setOpen(true);
    setLoading(true);
    setPreview(null);
    setLoadError(null);
    void loadPopWithVersionsAction(popId).then((res) => {
      setLoading(false);
      if (!res.ok || !res.latest) {
        setLoadError("Não foi possível carregar o POP.");
        return;
      }
      setPreview({
        title: res.latest.title,
        body: res.latest.body,
        version: res.latest.version_number,
      });
    });
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={startPreview}
        >
          Visualizar
        </Button>
        <Link
          href={`/pops/${popId}/editar`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Editar
        </Link>
        <Link
          href={`/pops/${popId}/pdf`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          target="_blank"
          rel="noopener noreferrer"
        >
          PDF
        </Link>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="max-h-[90vh] max-w-2xl sm:max-w-3xl"
          showCloseButton
        >
          <DialogHeader>
            <DialogTitle>
              {loading ? "POP" : (preview?.title ?? "POP")}
            </DialogTitle>
            <DialogDescription>
              {loading
                ? "A carregar…"
                : preview
                  ? `Versão ${preview.version} — apenas leitura`
                  : (loadError ?? "")}
            </DialogDescription>
          </DialogHeader>
          {loadError && !loading ? (
            <p className="text-destructive text-sm" role="alert">
              {loadError}
            </p>
          ) : null}
          {preview && !loading ? (
            <div className="border-border bg-muted/30 max-h-[min(60vh,28rem)] overflow-y-auto rounded-lg border p-3">
              <pre className="text-foreground font-sans text-sm whitespace-pre-wrap">
                {preview.body}
              </pre>
            </div>
          ) : null}
          <div className="flex justify-end border-t pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
