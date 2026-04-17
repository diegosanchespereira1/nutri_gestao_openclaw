"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createRecipeFromTemplateAction } from "@/lib/actions/technical-recipes";
import type { EstablishmentListItem } from "@/lib/types/establishments";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  templateId: string;
  templateName: string;
  establishments: EstablishmentListItem[];
  hasEstablishments: boolean;
};

export function TemplateUseButton({
  templateId,
  templateName,
  establishments,
  hasEstablishments,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedEstId, setSelectedEstId] = useState<string>("");
  const [recipeName, setRecipeName] = useState<string>(templateName);
  const [error, setError] = useState<string>("");

  function handleUse() {
    if (!selectedEstId.trim()) {
      setError("Selecione um estabelecimento.");
      return;
    }
    if (!recipeName.trim()) {
      setError("Insira o nome da receita.");
      return;
    }

    setError("");
    setPending(true);
    void (async () => {
      try {
        const result = await createRecipeFromTemplateAction(
          templateId,
          selectedEstId,
          recipeName,
        );
        if (!result.ok) {
          setError(result.error);
          return;
        }
        router.push(`/ficha-tecnica/${result.recipeId}/editar`);
      } finally {
        setPending(false);
      }
    })();
  }

  if (!hasEstablishments) {
    return (
      <Button variant="outline" size="sm" disabled className="opacity-50">
        Usar template
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="default"
        size="sm"
        onClick={() => {
          setOpen(true);
          setError("");
        }}
      >
        Usar template
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Usar template: {templateName}</DialogTitle>
            <DialogDescription>
              Escolha o estabelecimento e nomeie a nova receita. Os valores e
              fórmulas serão copiados para você editar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Estabelecimento */}
            <div className="space-y-2">
              <Label htmlFor="est-select">Estabelecimento</Label>
              <Select
                value={selectedEstId}
                onValueChange={(v) => setSelectedEstId(v || "")}
              >
                <SelectTrigger id="est-select">
                  <SelectValue placeholder="Selecione um estabelecimento…" />
                </SelectTrigger>
                <SelectContent>
                  {establishments.map((est) => (
                    <SelectItem key={est.id} value={est.id}>
                      {est.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nome da receita */}
            <div className="space-y-2">
              <Label htmlFor="recipe-name">Nome da receita</Label>
              <Input
                id="recipe-name"
                type="text"
                placeholder="Ex: Bolo de Chocolate"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
              />
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-destructive/10 text-destructive rounded-lg border border-destructive/30 px-3 py-2 text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUse}
              disabled={pending}
              className={cn(pending && "opacity-70")}
            >
              {pending ? "A criar…" : "Criar receita"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
