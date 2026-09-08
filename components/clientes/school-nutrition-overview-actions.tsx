"use client";

import { useState } from "react";
import { Download, Loader2, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { schoolOverviewPdfHref } from "@/lib/nutrition/child/school-overview";

type Props = {
  clientId: string;
  filter: string;
};

export function SchoolNutritionOverviewActions({ clientId, filter }: Props) {
  const [pdfState, setPdfState] = useState<"idle" | "loading" | "error">("idle");

  async function handlePdf() {
    setPdfState("loading");
    try {
      const res = await fetch(schoolOverviewPdfHref(clientId, filter), {
        cache: "no-store",
      });
      if (!res.ok) {
        setPdfState("error");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("content-disposition")?.match(/filename="?([^";]+)"?/i)?.[1] ??
        "visao-nutricional-escola.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPdfState("idle");
    } catch {
      setPdfState("error");
    }
  }

  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row print:hidden">
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full sm:w-auto"
        onClick={() => window.print()}
      >
        <Printer className="size-4" aria-hidden />
        Imprimir
      </Button>
      <Button
        type="button"
        className="min-h-11 w-full sm:w-auto"
        disabled={pdfState === "loading"}
        onClick={() => void handlePdf()}
      >
        {pdfState === "loading" ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Download className="size-4" aria-hidden />
        )}
        {pdfState === "loading" ? "A gerar…" : "Salvar PDF"}
      </Button>
      {pdfState === "error" ? (
        <p className="text-destructive text-xs sm:self-center" role="alert">
          Não foi possível gerar o PDF.{" "}
          <button type="button" className="underline" onClick={() => void handlePdf()}>
            Tentar outra vez
          </button>
        </p>
      ) : null}
    </div>
  );
}
